"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-init-script";

export type Theme = "light" | "dark";
type ThemePreference = Theme | "system";

interface ThemeContextValue {
  /** The theme actually applied right now. */
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Change to "dark" for a hard dark default instead of following the system.
const DEFAULT_PREFERENCE: ThemePreference = "system";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be blocked (private mode) — fall through to the default.
  }
  return DEFAULT_PREFERENCE;
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Both start at fixed values so server and first client render match;
  // the head script already painted the right class, and the layout
  // effects below sync state before the browser paints.
  const [preference, setPreference] = useState<ThemePreference>(DEFAULT_PREFERENCE);
  const [systemTheme, setSystemTheme] = useState<Theme>("dark");

  const theme: Theme = preference === "system" ? systemTheme : preference;

  useLayoutEffect(() => {
    setPreference(readStoredPreference());
  }, []);

  useLayoutEffect(() => {
    const query = window.matchMedia(LIGHT_QUERY);
    const sync = () => setSystemTheme(query.matches ? "light" : "dark");
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Layout effect on purpose: it runs before children's passive effects, so
  // Monaco reads the *new* CSS variables when it rebuilds its theme.
  useLayoutEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  function setTheme(next: Theme) {
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore — the choice still applies for this session.
    }
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return <ThemeContext value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}