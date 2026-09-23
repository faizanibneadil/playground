"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

import { DEFAULT_FILES } from "@/lib/default-code";
import { DEFAULT_PROJECT_NAME, sanitizeProjectNameInput } from "@/lib/slugify";

export type FileKey = "html" | "css" | "js";
export type MainView = "practical" | "theory";

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

interface PersistedState {
  projectName: string;
  files: PlaygroundFiles;
  theory: string;
}

interface PlaygroundState {
  projectName: string;
  files: PlaygroundFiles;
  theory: string;
  activeFile: FileKey;
  mainView: MainView;
  /** Play (true) = preview auto-refreshes as you type. Pause (false) =
   * edits are ignored until you resume (or Reset explicitly runs). */
  autoRun: boolean;
  logs: ConsoleLogEntry[];
  runVersion: number;
}

type Action =
  | { type: "SET_PROJECT_NAME"; name: string }
  | { type: "SET_FILE"; file: FileKey; content: string }
  | { type: "SET_THEORY"; content: string }
  | { type: "SET_ACTIVE_FILE"; file: FileKey }
  | { type: "SET_MAIN_VIEW"; view: MainView }
  | { type: "SET_AUTORUN"; value: boolean }
  | { type: "RESET" }
  | { type: "RUN" }
  | { type: "ADD_LOG"; entry: Omit<ConsoleLogEntry, "id"> }
  | { type: "CLEAR_LOGS" }
  | { type: "HYDRATE"; payload: PersistedState };

const STORAGE_PREFIX = "playground:";

const initialState: PlaygroundState = {
  projectName: DEFAULT_PROJECT_NAME,
  files: { ...DEFAULT_FILES },
  theory: "",
  activeFile: "html",
  mainView: "practical",
  autoRun: true,
  logs: [],
  runVersion: 0,
};

// A pure reducer: no localStorage access, no timers, no side effects here.
// Persistence and debouncing happen in the Provider's effects below, which
// keeps this function safe for the React Compiler to reason about.
function playgroundReducer(state: PlaygroundState, action: Action): PlaygroundState {
  switch (action.type) {
    case "SET_PROJECT_NAME": {
      const clean = sanitizeProjectNameInput(action.name);
      return { ...state, projectName: clean || DEFAULT_PROJECT_NAME };
    }
    case "SET_FILE":
      return {
        ...state,
        files: { ...state.files, [action.file]: action.content },
      };
    case "SET_THEORY":
      return { ...state, theory: action.content };
    case "SET_ACTIVE_FILE":
      return { ...state, activeFile: action.file };
    case "SET_MAIN_VIEW":
      return { ...state, mainView: action.view };
    case "SET_AUTORUN":
      return { ...state, autoRun: action.value };
    case "RESET":
      return {
        ...state,
        files: { ...DEFAULT_FILES },
        activeFile: "html",
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
    case "HYDRATE":
      return {
        ...state,
        projectName: action.payload.projectName,
        files: action.payload.files,
        theory: action.payload.theory,
      };
    default:
      return state;
  }
}

function loadPersisted(name: string): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + name);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function persist(payload: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + payload.projectName,
      JSON.stringify(payload),
    );
    return true;
  } catch {
    return false;
  }
}

interface PlaygroundActions {
  setProjectName: (name: string) => void;
  setFileContent: (file: FileKey, content: string) => void;
  setTheory: (content: string) => void;
  setActiveFile: (file: FileKey) => void;
  setMainView: (view: MainView) => void;
  setAutoRun: (value: boolean) => void;
  reset: () => void;
  run: () => void;
  addLog: (entry: Omit<ConsoleLogEntry, "id">) => void;
  clearLogs: () => void;
}

interface PlaygroundContextValue {
  state: PlaygroundState;
  actions: PlaygroundActions;
}

const PlaygroundContext = createContext<PlaygroundContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 500;

export function PlaygroundProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playgroundReducer, initialState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load whatever was auto-saved for the default project name once, on
  // mount, and kick off the first preview render.
  useEffect(() => {
    const persisted = loadPersisted(initialState.projectName);
    if (persisted) dispatch({ type: "HYDRATE", payload: persisted });
    dispatch({ type: "RUN" });
  }, []);

  // Save to localStorage a moment after typing stops. This always runs
  // silently in the background now — there's no user-facing toggle for it.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist({
        projectName: state.projectName,
        files: state.files,
        theory: state.theory,
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state.projectName, state.files, state.theory]);

  const actions: PlaygroundActions = {
    setProjectName: (name) => dispatch({ type: "SET_PROJECT_NAME", name }),
    setFileContent: (file, content) => dispatch({ type: "SET_FILE", file, content }),
    setTheory: (content) => dispatch({ type: "SET_THEORY", content }),
    setActiveFile: (file) => dispatch({ type: "SET_ACTIVE_FILE", file }),
    setMainView: (view) => dispatch({ type: "SET_MAIN_VIEW", view }),
    setAutoRun: (value) => dispatch({ type: "SET_AUTORUN", value }),
    reset: () => dispatch({ type: "RESET" }),
    run: () => dispatch({ type: "RUN" }),
    addLog: (entry) => dispatch({ type: "ADD_LOG", entry }),
    clearLogs: () => dispatch({ type: "CLEAR_LOGS" }),
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