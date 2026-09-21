// "use client";

// import { create } from "zustand";
// import { DEFAULT_FILES } from "@/lib/default-code";
// import { DEFAULT_PROJECT_NAME, sanitizeProjectNameInput } from "@/lib/slugify";

// export type FileKey = "html" | "css" | "js";
// export type MainView = "practical" | "theory";

// export interface ConsoleLogEntry {
//   id: string;
//   level: "log" | "warn" | "error" | "info";
//   message: string;
//   timestamp: number;
// }

// interface PlaygroundFiles {
//   html: string;
//   css: string;
//   js: string;
// }

// interface PersistedState {
//   projectName: string;
//   files: PlaygroundFiles;
// }

// const STORAGE_PREFIX = "playground:";

// interface PlaygroundState {
//   projectName: string;
//   files: PlaygroundFiles;
//   activeFile: FileKey;
//   mainView: MainView;
//   autoSave: boolean;
//   saveStatus: "idle" | "saved" | "unsaved";
//   logs: ConsoleLogEntry[];
//   runVersion: number;

//   setProjectName: (name: string) => void;
//   setFileContent: (file: FileKey, content: string) => void;
//   setActiveFile: (file: FileKey) => void;
//   setMainView: (view: MainView) => void;
//   setAutoSave: (value: boolean) => void;
//   reset: () => void;
//   run: () => void;
//   addLog: (entry: Omit<ConsoleLogEntry, "id">) => void;
//   clearLogs: () => void;
//   hydrateFromStorage: () => void;
//   persistNow: () => void;
// }

// function loadPersisted(name: string): PersistedState | null {
//   if (typeof window === "undefined") return null;
//   try {
//     const raw = window.localStorage.getItem(STORAGE_PREFIX + name);
//     if (!raw) return null;
//     return JSON.parse(raw) as PersistedState;
//   } catch {
//     return null;
//   }
// }

// let saveTimer: ReturnType<typeof setTimeout> | null = null;

// export const usePlaygroundStore = create<PlaygroundState>((set, get) => ({
//   projectName: DEFAULT_PROJECT_NAME,
//   files: { ...DEFAULT_FILES },
//   activeFile: "html",
//   mainView: "practical",
//   autoSave: true,
//   saveStatus: "idle",
//   logs: [],
//   runVersion: 0,

//   setProjectName: (name) => {
//     const clean = sanitizeProjectNameInput(name);
//     set({ projectName: clean || DEFAULT_PROJECT_NAME });
//     get().persistNow();
//   },

//   setFileContent: (file, content) => {
//     set((state) => ({ files: { ...state.files, [file]: content } }));
//     const { autoSave } = get();
//     if (autoSave) {
//       set({ saveStatus: "unsaved" });
//       if (saveTimer) clearTimeout(saveTimer);
//       saveTimer = setTimeout(() => {
//         get().persistNow();
//       }, 500);
//     }
//   },

//   setActiveFile: (file) => set({ activeFile: file }),
//   setMainView: (view) => set({ mainView: view }),

//   setAutoSave: (value) => {
//     set({ autoSave: value });
//     if (value) get().persistNow();
//   },

//   reset: () => {
//     set({
//       files: { ...DEFAULT_FILES },
//       activeFile: "html",
//       saveStatus: "idle",
//     });
//     get().persistNow();
//     get().run();
//   },

//   run: () => set((state) => ({ runVersion: state.runVersion + 1 })),

//   addLog: (entry) =>
//     set((state) => ({
//       logs: [
//         ...state.logs,
//         { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
//       ].slice(-300),
//     })),

//   clearLogs: () => set({ logs: [] }),

//   hydrateFromStorage: () => {
//     const persisted = loadPersisted(get().projectName);
//     if (persisted) {
//       set({ files: persisted.files, saveStatus: "saved" });
//     }
//   },

//   persistNow: () => {
//     if (typeof window === "undefined") return;
//     const { projectName, files } = get();
//     try {
//       window.localStorage.setItem(
//         STORAGE_PREFIX + projectName,
//         JSON.stringify({ projectName, files } satisfies PersistedState)
//       );
//       set({ saveStatus: "saved" });
//     } catch {
//       // Storage can fail (quota, private mode) — non-fatal for the playground.
//     }
//   },
// }));
