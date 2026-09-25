"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createPlaygroundUrl,
  deletePlaygroundUrl,
  findPlaygroundUrlByShortURL,
  getPlaygroundUrlById,
  longUrlMatchesShortUrl,
  PlaygroundApiError,
  updatePlaygroundUrl,
  type UrlRecord,
} from "@/lib/api/playground-url";
import { DEFAULT_FILES } from "@/lib/default-code";
import { DEFAULT_PROJECT_NAME, sanitizeProjectNameInput } from "@/lib/slugify";

export type FileKey = "html" | "css" | "js";
export type MainView = "practical" | "theory";
export type PendingAction = "create" | "save" | "share" | "reset" | "load" | null;

export interface ConsoleLogEntry {
  id: string;
  level: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: number;
}

interface PlaygroundFiles {
  html: string;
  css: string;
  js: string;
}

interface HydratePayload {
  projectName: string;
  files: PlaygroundFiles;
  theory: string;
  record: UrlRecord;
}

interface PlaygroundState {
  projectName: string;
  files: PlaygroundFiles;
  theory: string;
  activeFile: FileKey;
  mainView: MainView;
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
  | { type: "SET_FILE"; file: FileKey; content: string }
  | { type: "SET_THEORY"; content: string }
  | { type: "SET_ACTIVE_FILE"; file: FileKey }
  | { type: "SET_MAIN_VIEW"; view: MainView }
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
  files: { ...DEFAULT_FILES },
  theory: "",
  activeFile: "html",
  mainView: "practical",
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

function playgroundReducer(state: PlaygroundState, action: Action): PlaygroundState {
  switch (action.type) {
    case "SET_PROJECT_NAME": {
      const clean = sanitizeProjectNameInput(action.name);
      return { ...state, projectName: clean || DEFAULT_PROJECT_NAME };
    }
    case "SET_FILE":
      return { ...state, files: { ...state.files, [action.file]: action.content } };
    case "SET_THEORY":
      return { ...state, theory: action.content };
    case "SET_ACTIVE_FILE":
      return { ...state, activeFile: action.file };
    case "SET_MAIN_VIEW":
      return { ...state, mainView: action.view };
    case "RESET_LOCAL":
      return {
        ...state,
        files: { ...DEFAULT_FILES },
        projectName: DEFAULT_PROJECT_NAME,
        theory: "",
        activeFile: "html",
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
          { ...action.entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
        ].slice(-300),
      };
    case "CLEAR_LOGS":
      return { ...state, logs: [] };
    case "HYDRATE":
      return {
        ...state,
        projectName: action.payload.projectName,
        files: action.payload.files,
        theory: action.payload.theory,
        playgroundId: action.payload.record.id,
        shortURL: action.payload.record.shortURL,
        shareableUrl: action.payload.record.shareable_url,
        canShare: longUrlMatchesShortUrl(action.payload.record),
        runVersion: state.runVersion + 1,
      };
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
  setFileContent: (file: FileKey, content: string) => void;
  setTheory: (content: string) => void;
  setActiveFile: (file: FileKey) => void;
  setMainView: (view: MainView) => void;
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
        const data = record.urlState?.data;
        dispatch({
          type: "HYDRATE",
          payload: {
            projectName: data?.projectName ?? DEFAULT_PROJECT_NAME,
            files: {
              html: data?.html ?? DEFAULT_FILES.html,
              css: data?.css ?? DEFAULT_FILES.css,
              js: data?.js ?? DEFAULT_FILES.js,
            },
            theory: data?.theory ?? "",
            record,
          },
        });
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
      const { projectName, files, theory } = stateRef.current;
      const record = await createPlaygroundUrl({ projectName, ...files, theory });
      applyRecordMeta(record);
    } catch (err) {
      dispatch({ type: "SET_ACTION_ERROR", message: errorMessage(err) });
    } finally {
      dispatch({ type: "SET_PENDING_ACTION", action: null });
    }
  }

  async function save() {
    if (isReadOnly) return false;
    const { playgroundId, shortURL, projectName, files, theory } = stateRef.current;
    if (!playgroundId || !shortURL) return false;

    dispatch({ type: "SET_PENDING_ACTION", action: "save" });
    dispatch({ type: "SET_ACTION_ERROR", message: null });
    try {
      const record = await updatePlaygroundUrl(
        playgroundId,
        { projectName, ...files, theory },
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
    setFileContent: (file, content) => dispatch({ type: "SET_FILE", file, content }),
    setTheory: (content) => dispatch({ type: "SET_THEORY", content }),
    setActiveFile: (file) => dispatch({ type: "SET_ACTIVE_FILE", file }),
    setMainView: (view) => dispatch({ type: "SET_MAIN_VIEW", view }),
    addLog: (entry) => dispatch({ type: "ADD_LOG", entry }),
    clearLogs: () => dispatch({ type: "CLEAR_LOGS" }),
    refresh,
    save,
    share,
    reset,
  };

  return (
    <PlaygroundContext value={{ state, actions, isReadOnly }}>{children}</PlaygroundContext>
  );
}

export function usePlayground() {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) {
    throw new Error("usePlayground must be used within a PlaygroundProvider");
  }
  return ctx;
}