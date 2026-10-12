import type { StoredPlaygroundData } from "@/lib/api/playground-url";
import { DEFAULT_CSS, DEFAULT_HTML, DEFAULT_JS, DEFAULT_NODES } from "@/lib/default-code";
import {
  createNodeId,
  type FsNode,
  fromPersistedEntries,
  toPersistedEntries,
} from "@/lib/file-tree";
import { insertBeforeLastTag } from "@/lib/preview-document";
import { DEFAULT_PROJECT_NAME } from "@/lib/slugify";

export interface LoadedProject {
  projectName: string;
  theory: string;
  nodes: FsNode[];
}

/** Shape written to the share service: the whole tree as path based entries. */
export function serializeProject(
  projectName: string,
  nodes: readonly FsNode[],
  theory: string,
) {
  return { projectName, theory, files: toPersistedEntries(nodes) };
}

const STYLE_LINK = /<link\b[^>]*\bhref\s*=\s*["'](?:\.\/)?style\.css(?:[?#][^"']*)?["']/i;
const SCRIPT_TAG =
  /<script\b[^>]*\bsrc\s*=\s*["'](?:\.\/)?script\.js(?:[?#][^"']*)?["']/i;

/**
 * Older records only stored `html`, `css` and `js`, and the preview used to
 * attach `style.css` / `script.js` automatically even when the HTML never
 * referenced them. The sandbox now only runs what the HTML actually links,
 * like a real project, so those implicit references are written into the
 * HTML once, when an old record is opened. Nothing changes for the student.
 */
function withExplicitReferences(html: string): string {
  let result = html;
  if (!STYLE_LINK.test(result)) {
    const tag = '\n<link rel="stylesheet" href="style.css">\n';
    result = insertBeforeLastTag(result, "</head>", tag) ?? tag + result;
  }
  if (!SCRIPT_TAG.test(result)) {
    const tag = '\n<script src="script.js"></script>\n';
    result = insertBeforeLastTag(result, "</body>", tag) ?? result + tag;
  }
  return result;
}

function legacyNodes(data: StoredPlaygroundData): FsNode[] {
  return [
    {
      id: createNodeId(),
      parentId: null,
      name: "index.html",
      type: "file",
      content: withExplicitReferences(data.html ?? DEFAULT_HTML),
    },
    {
      id: createNodeId(),
      parentId: null,
      name: "style.css",
      type: "file",
      content: data.css ?? DEFAULT_CSS,
    },
    {
      id: createNodeId(),
      parentId: null,
      name: "script.js",
      type: "file",
      content: data.js ?? DEFAULT_JS,
    },
  ];
}

/** Reads a stored record, supporting both the tree format and the legacy html/css/js format. */
export function deserializeProject(
  data: StoredPlaygroundData | undefined,
): LoadedProject {
  const projectName = data?.projectName ?? DEFAULT_PROJECT_NAME;
  const theory = data?.theory ?? "";

  if (!data) return { projectName, theory, nodes: DEFAULT_NODES };

  if (Array.isArray(data.files)) {
    return { projectName, theory, nodes: fromPersistedEntries(data.files) };
  }

  return { projectName, theory, nodes: legacyNodes(data) };
}
