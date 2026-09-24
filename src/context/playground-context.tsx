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
  getPlaygroundUrl,
  PlaygroundApiError,
  updatePlaygroundUrl,
} from "@/lib/api/playground-url";
import { DEFAULT_FILES } from "@/lib/default-code";
import { DEFAULT_PROJECT_NAME, sanitizeProjectNameInput } from "@/lib/slugify";

export type FileKey = "html" | "css" | "js";
export type MainView = "practical" | "theory";
export type PendingAction = "save" | "share" | "reset" | null;

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
  playgroundId: string;
}

interface PlaygroundState {
  projectName: string;
  files: PlaygroundFiles;
  theory: string;
  activeFile: FileKey;
  mainView: MainView;
  autoRun: boolean;
  logs: ConsoleLogEntry[];
  runVersion: number;
  /** Set once this playground has been Saved or Shared, and mirrored in
   * the URL as ?playgroundId=. Its presence is what switches the header
   * from showing Save to showing Share. */
  playgroundId: string | null;
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
  | { type: "SET_AUTORUN"; value: boolean }
  | { type: "RESET_LOCAL" }
  | { type: "RUN" }
  | { type: "ADD_LOG"; entry: Omit<ConsoleLogEntry, "id"> }
  | { type: "CLEAR_LOGS" }
  | { type: "HYDRATE"; payload: HydratePayload }
  | { type: "SET_PLAYGROUND_ID"; id: string | null }
  | { type: "SET_PENDING_ACTION"; action: PendingAction }
  | { type: "SET_ACTION_ERROR"; message: string | null }
  | { type: "SET_NOTICE"; message: string | null };

const initialState: PlaygroundState = {
  projectName: DEFAULT_PROJECT_NAME,
  files: { ...DEFAULT_FILES },
  theory: "",
  activeFile: "html",
  mainView: "practical",
  autoRun: true,
  logs: [],
  runVersion: 0,
  playgroundId: null,
  pendingAction: null,
  actionError: null,
  notice: null,
};

// A pure reducer: no fetches, no localStorage, no timers, no router calls.
// Every side effect (API calls, URL changes) lives in the actions below,
// which then dispatch plain state updates here.
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
    case "SET_AUTORUN":
      return { ...state, autoRun: action.value };
    case "RESET_LOCAL":
      // Fully fresh playground: new code, new name, no linked record.
      return {
        ...state,
        files: { ...DEFAULT_FILES },
        projectName: DEFAULT_PROJECT_NAME,
        theory: "",
        activeFile: "html",
        playgroundId: null,
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
        playgroundId: action.payload.playgroundId,
        runVersion: state.runVersion + 1,
      };
    case "SET_PLAYGROUND_ID":
      return { ...state, playgroundId: action.id };
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
  setAutoRun: (value: boolean) => void;
  run: () => void;
  addLog: (entry: Omit<ConsoleLogEntry, "id">) => void;
  clearLogs: () => void;
  /** Creates the record on first save. Returns true on success. */
  save: () => Promise<boolean>;
  /** Updates the record's code/theory + longURL, then opens the native
   * share sheet (falls back to clipboard copy). Returns true on success. */
  share: () => Promise<boolean>;
  /** Deletes the linked record (if any) and returns to a fresh, unsaved
   * playground. Returns true on success — false leaves everything
   * untouched so the user can retry. */
  reset: () => Promise<boolean>;
}

interface PlaygroundContextValue {
  state: PlaygroundState;
  actions: PlaygroundActions;
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

  // Keep the latest state available to async actions without making them
  // stale-closure-prone or forcing them into the dependency arrays below.
  const stateRef = useRef(state);
  stateRef.current = state;

  function setQueryPlaygroundId(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("playgroundId", id);
    else params.delete("playgroundId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // On mount: if the URL already carries a playgroundId (a shared link),
  // fetch that record and populate the editors, theory panel and preview
  // from it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once, on mount only.
  useEffect(() => {
    const id = searchParams.get("playgroundId");
    if (!id) {
      dispatch({ type: "RUN" });
      return;
    }
    dispatch({ type: "SET_PENDING_ACTION", action: "share" });
    getPlaygroundUrl(id)
      .then((record) => {
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
            playgroundId: id,
          },
        });
      })
      .catch((err) => {
        dispatch({ type: "SET_ACTION_ERROR", message: errorMessage(err) });
        setQueryPlaygroundId(null);
        dispatch({ type: "RUN" });
      })
      .finally(() => dispatch({ type: "SET_PENDING_ACTION", action: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Transient notices/errors clear themselves after a few seconds.
  useEffect(() => {
    if (!state.notice) return;
    const timer = setTimeout(() => dispatch({ type: "SET_NOTICE", message: null }), 3000);
    return () => clearTimeout(timer);
  }, [state.notice]);

  async function save() {
    dispatch({ type: "SET_PENDING_ACTION", action: "save" });
    dispatch({ type: "SET_ACTION_ERROR", message: null });
    try {
      const { projectName, files, theory } = stateRef.current;
      const record = await createPlaygroundUrl({ projectName, ...files, theory });
      dispatch({ type: "SET_PLAYGROUND_ID", id: record.id });
      setQueryPlaygroundId(record.id);
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
    const { playgroundId, projectName, files, theory } = stateRef.current;
    if (!playgroundId) return false;

    dispatch({ type: "SET_PENDING_ACTION", action: "share" });
    dispatch({ type: "SET_ACTION_ERROR", message: null });
    try {
      const record = await updatePlaygroundUrl(playgroundId, { projectName, ...files, theory });
      const url = record.shareable_url;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: projectName, url });
        } catch {
          // User cancelled the native share sheet — not an error.
        }
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
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
    const { playgroundId } = stateRef.current;
    dispatch({ type: "SET_PENDING_ACTION", action: "reset" });
    dispatch({ type: "SET_ACTION_ERROR", message: null });
    try {
      if (playgroundId) {
        await deletePlaygroundUrl(playgroundId);
        setQueryPlaygroundId(null);
      }
      dispatch({ type: "RESET_LOCAL" });
      return true;
    } catch (err) {
      // Delete failed — leave the URL/state exactly as it was so nothing
      // is lost, and let the user retry.
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
    setAutoRun: (value) => dispatch({ type: "SET_AUTORUN", value }),
    run: () => dispatch({ type: "RUN" }),
    addLog: (entry) => dispatch({ type: "ADD_LOG", entry }),
    clearLogs: () => dispatch({ type: "CLEAR_LOGS" }),
    save,
    share,
    reset,
  };

  return <PlaygroundContext value={{ state, actions }}>{children}</PlaygroundContext>;
}

export function usePlayground() {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) {
    throw new Error("usePlayground must be used within a PlaygroundProvider");
  }
  return ctx;
}