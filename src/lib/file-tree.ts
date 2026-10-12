import type { EditorLanguage } from "@/lib/format-code";

/**
 * Pure helpers for the sandbox's virtual file system.
 *
 * The tree is stored as a flat list of nodes linked by `parentId` (instead of
 * a nested structure) so rename/delete/content updates are simple immutable
 * array operations and every node keeps a stable id that survives renames.
 */

interface BaseNode {
  id: string;
  /** `null` means the node lives at the project root. */
  parentId: string | null;
  name: string;
}

export interface FileNode extends BaseNode {
  type: "file";
  content: string;
}

export interface FolderNode extends BaseNode {
  type: "folder";
}

export type FsNode = FileNode | FolderNode;

export const MAX_NODE_NAME_LENGTH = 100;

// Characters that are illegal in file names on common operating systems. Keeping
// them out means a project can always be downloaded/exported later.
// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are intentionally rejected.
const INVALID_NAME_CHARS = /[\\/:*?"<>|\u0000-\u001f]/;

export function createNodeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // `crypto.randomUUID` only exists in secure contexts (https / localhost).
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function findNode(
  nodes: readonly FsNode[],
  id: string | null,
): FsNode | undefined {
  if (id === null) return undefined;
  return nodes.find((node) => node.id === id);
}

/** Folders first, then files, each group sorted naturally by name (like VS Code). */
export function getChildren(nodes: readonly FsNode[], parentId: string | null): FsNode[] {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

/** Slash-separated path of a node from the project root, e.g. `css/main.css`. */
export function getNodePath(nodes: readonly FsNode[], id: string): string {
  const segments: string[] = [];
  const visited = new Set<string>();
  let current = findNode(nodes, id);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    segments.unshift(current.name);
    current = findNode(nodes, current.parentId);
  }
  return segments.join("/");
}

/** Ids of a node plus everything nested inside it. */
export function collectSubtreeIds(nodes: readonly FsNode[], id: string): Set<string> {
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of nodes) {
      if (node.parentId !== null && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        grew = true;
      }
    }
  }
  return ids;
}

/**
 * Returns a human readable error when `name` can't be used for a node inside
 * `parentId`, or `null` when it is fine. `ignoreId` is the node being renamed
 * so keeping its own name isn't reported as a duplicate.
 */
export function validateNodeName(
  nodes: readonly FsNode[],
  parentId: string | null,
  name: string,
  ignoreId?: string,
): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "A file or folder name must be provided.";
  if (trimmed.length > MAX_NODE_NAME_LENGTH) {
    return `Names can be at most ${MAX_NODE_NAME_LENGTH} characters.`;
  }
  if (trimmed === "." || trimmed === "..") return `"${trimmed}" is not a valid name.`;
  if (INVALID_NAME_CHARS.test(trimmed)) {
    return "Names can't contain \\ / : * ? \" < > |";
  }
  const lower = trimmed.toLowerCase();
  const clash = nodes.some(
    (node) =>
      node.parentId === parentId &&
      node.id !== ignoreId &&
      node.name.toLowerCase() === lower,
  );
  if (clash) return `"${trimmed}" already exists in this location.`;
  return null;
}

export function addNode(nodes: readonly FsNode[], node: FsNode): FsNode[] {
  return [...nodes, node];
}

export function renameNode(nodes: readonly FsNode[], id: string, name: string): FsNode[] {
  const trimmed = name.trim();
  return nodes.map((node) => (node.id === id ? { ...node, name: trimmed } : node));
}

export function updateFileContent(
  nodes: readonly FsNode[],
  id: string,
  content: string,
): FsNode[] {
  return nodes.map((node) =>
    node.id === id && node.type === "file" ? { ...node, content } : node,
  );
}

export function removeNode(
  nodes: readonly FsNode[],
  id: string,
): { nodes: FsNode[]; removedIds: Set<string> } {
  const removedIds = collectSubtreeIds(nodes, id);
  return { nodes: nodes.filter((node) => !removedIds.has(node.id)), removedIds };
}

/* -------------------------------------------------------------------------- */
/* Persistence shape                                                          */
/* -------------------------------------------------------------------------- */

/** Path based representation stored in the shared record (ids are regenerated on load). */
export interface PersistedEntry {
  path: string;
  type: "file" | "folder";
  content?: string;
}

export function toPersistedEntries(nodes: readonly FsNode[]): PersistedEntry[] {
  return nodes
    .map((node): PersistedEntry => {
      const path = getNodePath(nodes, node.id);
      return node.type === "file"
        ? { path, type: "file", content: node.content }
        : { path, type: "folder" };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Rebuilds the node list from stored entries, skipping anything malformed. */
export function fromPersistedEntries(entries: readonly PersistedEntry[]): FsNode[] {
  const nodes: FsNode[] = [];
  const folderIdByPath = new Map<string, string>();

  function ensureFolder(segments: string[]): string | null {
    let parentId: string | null = null;
    let path = "";
    for (const segment of segments) {
      path = path ? `${path}/${segment}` : segment;
      let id = folderIdByPath.get(path.toLowerCase());
      if (!id) {
        if (validateNodeName(nodes, parentId, segment) !== null) return null;
        id = createNodeId();
        nodes.push({ id, parentId, name: segment, type: "folder" });
        folderIdByPath.set(path.toLowerCase(), id);
      }
      parentId = id;
    }
    return parentId;
  }

  for (const entry of entries) {
    if (!entry || typeof entry.path !== "string") continue;
    const segments = entry.path.split("/").filter((segment) => segment.length > 0);
    const name = segments.pop();
    if (!name) continue;

    const parentId = segments.length > 0 ? ensureFolder(segments) : null;
    if (segments.length > 0 && parentId === null) continue;

    if (entry.type === "folder") {
      ensureFolder([...segments, name]);
      continue;
    }
    if (validateNodeName(nodes, parentId, name) !== null) continue;
    nodes.push({
      id: createNodeId(),
      parentId,
      name,
      type: "file",
      content: typeof entry.content === "string" ? entry.content : "",
    });
  }

  return nodes;
}

/* -------------------------------------------------------------------------- */
/* File type helpers                                                          */
/* -------------------------------------------------------------------------- */

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot <= 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

const MONACO_LANGUAGE_BY_EXTENSION: Record<string, string> = {
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  less: "less",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  md: "markdown",
  svg: "xml",
  xml: "xml",
  txt: "plaintext",
};

export function getMonacoLanguage(fileName: string): string {
  return MONACO_LANGUAGE_BY_EXTENSION[getExtension(fileName)] ?? "plaintext";
}

/** Languages Prettier can format in the browser; `null` means "not formattable". */
export function getFormatLanguage(fileName: string): EditorLanguage | null {
  switch (getMonacoLanguage(fileName)) {
    case "html":
      return "html";
    case "css":
      return "css";
    case "javascript":
      return "javascript";
    default:
      return null;
  }
}

export type FileKind = "html" | "css" | "js" | "json" | "markdown" | "other";

export function getFileKind(fileName: string): FileKind {
  switch (getMonacoLanguage(fileName)) {
    case "html":
      return "html";
    case "css":
    case "scss":
    case "less":
      return "css";
    case "javascript":
    case "typescript":
      return "js";
    case "json":
      return "json";
    case "markdown":
      return "markdown";
    default:
      return "other";
  }
}
