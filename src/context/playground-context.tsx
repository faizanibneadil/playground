"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

import {
  createPlaygroundUrl,
  deletePlaygroundUrl,
  findPlaygroundUrlByShortURL,
  getPlaygroundUrlById,
  longUrlMatchesShortUrl,
  PlaygroundApiError,
  type UrlRecord,
  updatePlaygroundUrl,
} from "@/lib/api/playground-url";
import { DEFAULT_INDEX_FILE_ID, DEFAULT_NODES } from "@/lib/default-code";
import {
  addNode,
  createNodeId,
  type FsNode,
  findNode,
  removeNode,
  renameNode,
  updateFileContent,
  validateNodeName,
} from "@/lib/file-tree";
import { deserializeProject, serializeProject } from "@/lib/playground-data";
import { DEFAULT_PROJECT_NAME, sanitizeProjectNameInput } from "@/lib/slugify";

/** Which view the primary sidebar shows; `null` means the sidebar is collapsed. */
export type SidebarView = "files" | "theory" | null;
export type PendingAction = "create" | "save" | "share" | "reset" | "load" | null;

export interface ConsoleLogEntry {
  id: string;
  level: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: number;
}

interface HydratePayload {
  projectName: string;
  nodes: FsNode[];
  theory: string;
  record: UrlRecord;
}

interface PlaygroundState {
  projectName: string;
  /** Flat list of the project's files and folders (see lib/file-tree.ts). */
  nodes: FsNode[];
  theory: string;
  /** File shown in the editor, `null` when no file is open. */
  activeFileId: string | null;
  /** Open editor tabs, in tab order. */
  openFileIds: string[];
  sidebarView: SidebarView;
  logs: ConsoleLogEntry[];
  runVersion: number;
  playgroundId: string | null;
  shortURL: string | null;
  shareableUrl: string | null;
  canShare: boolean;
  pendingAction: PendingAction;
  actionError: string | null;
  notice: string | null;
}

type Action =
  | { type: "SET_PROJECT_NAME"; name: string }
  | { type: "ADD_NODE"; node: FsNode }
  | { type: "RENAME_NODE"; id: string; name: string }
  | { type: "DELETE_NODE"; id: string }
  | { type: "SET_FILE_CONTENT"; id: string; content: string }
  | { type: "SET_THEORY"; content: string }
  | { type: "OPEN_FILE"; id: string }
  | { type: "CLOSE_FILE"; id: string }
  | { type: "SET_SIDEBAR_VIEW"; view: SidebarView }
  | { type: "RESET_LOCAL" }
  | { type: "RUN" }
  | { type: "ADD_LOG"; entry: Omit<ConsoleLogEntry, "id"> }
  | { type: "CLEAR_LOGS" }
  | { type: "HYDRATE"; payload: HydratePayload }
  | { type: "SET_RECORD_META"; record: UrlRecord }
  | { type: "SET_PENDING_ACTION"; action: PendingAction }
  | { type: "SET_ACTION_ERROR"; message: string | null }
  | { type: "SET_NOTICE"; message: string | null };

const initialState: PlaygroundState = {
  projectName: DEFAULT_PROJECT_NAME,
  nodes: DEFAULT_NODES,
  theory: "",
  activeFileId: DEFAULT_INDEX_FILE_ID,
  openFileIds: [DEFAULT_INDEX_FILE_ID],
  sidebarView: "files",
  logs: [],
  runVersion: 0,
  playgroundId: null,
  shortURL: null,
  shareableUrl: null,
  canShare: false,
  pendingAction: null,
  actionError: null,
  notice: null,
};

/** The file a freshly loaded project opens first: index.html, else the first file. */
function pickInitialFile(nodes: readonly FsNode[]): string | null {
  const rootFiles = nodes.filter(
    (node) => node.type === "file" && node.parentId === null,
  );
  const index = rootFiles.find((node) => node.name === "index.html");
  return (
    (index ?? rootFiles[0] ?? nodes.find((node) => node.type === "file"))?.id ?? null
  );
}

/** After the active tab goes away, activate the tab that took its place (the right
 * neighbour, or the last tab when it was the final one). */
function pickNeighbourTab(
  openIds: readonly string[],
  activeId: string,
  removedIds: ReadonlySet<string>,
): string | null {
  const remaining = openIds.filter((id) => !removedIds.has(id));
  const position = openIds
    .slice(0, openIds.indexOf(activeId))
    .filter((id) => !removedIds.has(id)).length;
  return remaining[Math.min(position, remaining.length - 1)] ?? null;
}

function playgroundReducer(state: PlaygroundState, action: Action): PlaygroundState {
  switch (action.type) {
    case "SET_PROJECT_NAME": {
      const clean = sanitizeProjectNameInput(action.name);
      return { ...state, projectName: clean || DEFAULT_PROJECT_NAME };
    }
    case "ADD_NODE": {
      const { node } = action;
      if (
        node.parentId !== null &&
        findNode(state.nodes, node.parentId)?.type !== "folder"
      ) {
        return state;
      }
      if (validateNodeName(state.nodes, node.parentId, node.name) !== null) return state;
      const nodes = addNode(state.nodes, { ...node, name: node.name.trim() });
      if (node.type === "folder") return { ...state, nodes };
      return {
        ...state,
        nodes,
        openFileIds: [...state.openFileIds, node.id],
        activeFileId: node.id,
      };
    }
    case "RENAME_NODE": {
      const target = findNode(state.nodes, action.id);
      if (!target) return state;
      if (
        validateNodeName(state.nodes, target.parentId, action.name, target.id) !== null
      ) {
        return state;
      }
      return { ...state, nodes: renameNode(state.nodes, action.id, action.name) };
    }
    case "DELETE_NODE": {
      if (!findNode(state.nodes, action.id)) return state;
      const { nodes, removedIds } = removeNode(state.nodes, action.id);
      const openFileIds = state.openFileIds.filter((id) => !removedIds.has(id));
      let activeFileId = state.activeFileId;
      if (activeFileId !== null && removedIds.has(activeFileId)) {
        activeFileId = pickNeighbourTab(state.openFileIds, activeFileId, removedIds);
      }
      return { ...state, nodes, openFileIds, activeFileId };
    }
    case "SET_FILE_CONTENT":
      return {
        ...state,
        nodes: updateFileContent(state.nodes, action.id, action.content),
      };
    case "SET_THEORY":
      return { ...state, theory: action.content };
    case "OPEN_FILE": {
      if (findNode(state.nodes, action.id)?.type !== "file") return state;
      return {
        ...state,
        openFileIds: state.openFileIds.includes(action.id)
          ? state.openFileIds
          : [...state.openFileIds, action.id],
        activeFileId: action.id,
      };
    }
    case "CLOSE_FILE": {
      if (!state.openFileIds.includes(action.id)) return state;
      const openFileIds = state.openFileIds.filter((id) => id !== action.id);
      const activeFileId =
        state.activeFileId === action.id
          ? pickNeighbourTab(state.openFileIds, action.id, new Set([action.id]))
          : state.activeFileId;
      return { ...state, openFileIds, activeFileId };
    }
    case "SET_SIDEBAR_VIEW":
      return { ...state, sidebarView: action.view };
    case "RESET_LOCAL":
      return {
        ...state,
        nodes: DEFAULT_NODES,
        projectName: DEFAULT_PROJECT_NAME,
        theory: "",
        activeFileId: DEFAULT_INDEX_FILE_ID,
        openFileIds: [DEFAULT_INDEX_FILE_ID],
        playgroundId: null,
        shortURL: null,
        shareableUrl: null,
        canShare: false,
        actionError: null,
        notice: null,
        runVersion: state.runVersion + 1,
      };
    case "RUN":
      return { ...state, runVersion: state.runVersion + 1 };
    case "ADD_LOG":
      return {
        ...state,
        logs: [
          ...state.logs,
          {
            ...action.entry,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        ].slice(-300),
      };
    case "CLEAR_LOGS":
      return { ...state, logs: [] };
    case "HYDRATE": {
      const initialFileId = pickInitialFile(action.payload.nodes);
      return {
        ...state,
        projectName: action.payload.projectName,
        nodes: action.payload.nodes,
        activeFileId: initialFileId,
        openFileIds: initialFileId ? [initialFileId] : [],
        theory: action.payload.theory,
        playgroundId: action.payload.record.id,
        shortURL: action.payload.record.shortURL,
        shareableUrl: action.payload.record.shareable_url,
        canShare: longUrlMatchesShortUrl(action.payload.record),
        runVersion: state.runVersion + 1,
      };
    }
    case "SET_RECORD_META":
      return {
        ...state,
        playgroundId: action.record.id,
        shortURL: action.record.shortURL,
        shareableUrl: action.record.shareable_url,
        canShare: longUrlMatchesShortUrl(action.record),
      };
    case "SET_PENDING_ACTION":
      return { ...state, pendingAction: action.action };
    case "SET_ACTION_ERROR":
      return { ...state, actionError: action.message };
    case "SET_NOTICE":
      return { ...state, notice: action.message };
    default:
      return state;
  }
}

interface PlaygroundActions {
  setProjectName: (name: string) => void;
  createFile: (parentId: string | null, name: string) => void;
  createFolder: (parentId: string | null, name: string) => void;
  renameNode: (id: string, name: string) => void;
  deleteNode: (id: string) => void;
  setFileContent: (id: string, content: string) => void;
  setTheory: (content: string) => void;
  openFile: (id: string) => void;
  closeFile: (id: string) => void;
  setSidebarView: (view: SidebarView) => void;
  addLog: (entry: Omit<ConsoleLogEntry, "id">) => void;
  clearLogs: () => void;
  refresh: () => Promise<void>;
  save: () => Promise<boolean>;
  share: () => Promise<boolean>;
  reset: () => Promise<boolean>;
}

interface PlaygroundContextValue {
  state: PlaygroundState;
  actions: PlaygroundActions;
  /** True when this session only has read access (opened via a shared
   * link's ?a=r). Theory becomes non-editable and Save/Reset disappear.
   * Anything other than "r" (including no ?a= at all, e.g. a brand new
   * playground) counts as write access. */
  isReadOnly: boolean;
}

const PlaygroundContext = createContext<PlaygroundContextValue | null>(null);

function errorMessage(err: unknown): string {
  if (err instanceof PlaygroundApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export function PlaygroundProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playgroundReducer, initialState);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isReadOnly = searchParams.get("a") === "r";

  const stateRef = useRef(state);
  stateRef.current = state;

  function setRecordQueryParams(id: string, shortURL: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("playgroundId", id);
    params.set("shortURL", shortURL);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearRecordQueryParams() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("playgroundId");
    params.delete("shortURL");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function applyRecordMeta(record: UrlRecord) {
    dispatch({ type: "SET_RECORD_META", record });
    setRecordQueryParams(record.id, record.shortURL);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once, on mount only.
  useEffect(() => {
    const idParam = searchParams.get("playgroundId");
    const shortParam = searchParams.get("shortURL");

    if (!idParam && !shortParam) {
      dispatch({ type: "RUN" });
      return;
    }

    dispatch({ type: "SET_PENDING_ACTION", action: "load" });
    const lookup = idParam
      ? getPlaygroundUrlById(idParam)
      : findPlaygroundUrlByShortURL(shortParam as string);

    lookup
      .then((record) => {
        if (!record) {
          throw new PlaygroundApiError("This playground link no longer exists.");
        }
        const project = deserializeProject(record.urlState?.data);
        dispatch({ type: "HYDRATE", payload: { ...project, record } });
        setRecordQueryParams(record.id, record.shortURL);
      })
      .catch((err) => {
        dispatch({ type: "SET_ACTION_ERROR", message: errorMessage(err) });
        clearRecordQueryParams();
        dispatch({ type: "RUN" });
      })
      .finally(() => dispatch({ type: "SET_PENDING_ACTION", action: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.notice) return;
    const timer = setTimeout(() => dispatch({ type: "SET_NOTICE", message: null }), 3000);
    return () => clearTimeout(timer);
  }, [state.notice]);

  async function refresh() {
    dispatch({ type: "RUN" });
    if (stateRef.current.playgroundId) return; // already created — purely local from here on
    if (isReadOnly) return; // never creates a record for a read-only viewer

    dispatch({ type: "SET_PENDING_ACTION", action: "create" });
    dispatch({ type: "SET_ACTION_ERROR", message: null });
    try {
      const { projectName, nodes, theory } = stateRef.current;
      const record = await createPlaygroundUrl(
        serializeProject(projectName, nodes, theory),
      );
      applyRecordMeta(record);
    } catch (err) {
      dispatch({ type: "SET_ACTION_ERROR", message: errorMessage(err) });
    } finally {
      dispatch({ type: "SET_PENDING_ACTION", action: null });
    }
  }

  async function save() {
    if (isReadOnly) return false;
    const { playgroundId, shortURL, projectName, nodes, theory } = stateRef.current;
    if (!playgroundId || !shortURL) return false;

    dispatch({ type: "SET_PENDING_ACTION", action: "save" });
    dispatch({ type: "SET_ACTION_ERROR", message: null });
    try {
      const record = await updatePlaygroundUrl(
        playgroundId,
        serializeProject(projectName, nodes, theory),
        shortURL,
      );
      applyRecordMeta(record);
      dispatch({ type: "SET_NOTICE", message: "Saved" });
      return true;
    } catch (err) {
      dispatch({ type: "SET_ACTION_ERROR", message: errorMessage(err) });
      return false;
    } finally {
      dispatch({ type: "SET_PENDING_ACTION", action: null });
    }
  }

  async function share() {
    const { shareableUrl, projectName } = stateRef.current;
    if (!shareableUrl) return false;

    dispatch({ type: "SET_PENDING_ACTION", action: "share" });
    dispatch({ type: "SET_ACTION_ERROR", message: null });
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: projectName, url: shareableUrl });
        } catch {
          // User cancelled the native share sheet — not an error.
        }
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareableUrl);
        dispatch({ type: "SET_NOTICE", message: "Link copied to clipboard" });
      }
      return true;
    } catch (err) {
      dispatch({ type: "SET_ACTION_ERROR", message: errorMessage(err) });
      return false;
    } finally {
      dispatch({ type: "SET_PENDING_ACTION", action: null });
    }
  }

  async function reset() {
    if (isReadOnly) return false;
    const { playgroundId } = stateRef.current;
    dispatch({ type: "SET_PENDING_ACTION", action: "reset" });
    dispatch({ type: "SET_ACTION_ERROR", message: null });
    try {
      if (playgroundId) {
        await deletePlaygroundUrl(playgroundId);
      }
      clearRecordQueryParams();
      dispatch({ type: "RESET_LOCAL" });
      return true;
    } catch (err) {
      dispatch({ type: "SET_ACTION_ERROR", message: errorMessage(err) });
      return false;
    } finally {
      dispatch({ type: "SET_PENDING_ACTION", action: null });
    }
  }

  const actions: PlaygroundActions = {
    setProjectName: (name) => dispatch({ type: "SET_PROJECT_NAME", name }),
    createFile: (parentId, name) =>
      dispatch({
        type: "ADD_NODE",
        node: { id: createNodeId(), parentId, name, type: "file", content: "" },
      }),
    createFolder: (parentId, name) =>
      dispatch({
        type: "ADD_NODE",
        node: { id: createNodeId(), parentId, name, type: "folder" },
      }),
    renameNode: (id, name) => dispatch({ type: "RENAME_NODE", id, name }),
    deleteNode: (id) => dispatch({ type: "DELETE_NODE", id }),
    setFileContent: (id, content) => dispatch({ type: "SET_FILE_CONTENT", id, content }),
    setTheory: (content) => dispatch({ type: "SET_THEORY", content }),
    openFile: (id) => dispatch({ type: "OPEN_FILE", id }),
    closeFile: (id) => dispatch({ type: "CLOSE_FILE", id }),
    setSidebarView: (view) => dispatch({ type: "SET_SIDEBAR_VIEW", view }),
    addLog: (entry) => dispatch({ type: "ADD_LOG", entry }),
    clearLogs: () => dispatch({ type: "CLEAR_LOGS" }),
    refresh,
    save,
    share,
    reset,
  };

  return (
    <PlaygroundContext value={{ state, actions, isReadOnly }}>
      {children}
    </PlaygroundContext>
  );
}

export function usePlayground() {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) {
    throw new Error("usePlayground must be used within a PlaygroundProvider");
  }
  return ctx;
}
