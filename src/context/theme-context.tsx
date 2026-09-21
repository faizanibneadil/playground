"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "playground:theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer avoids a flash by matching whatever the blocking
  // inline script in <head> already applied to <html> on first paint.
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme());

  useEffect(() => {
    applyThemeClass(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // No useCallback here: the React Compiler (see next.config.ts) memoizes
  // this component's output automatically, including these function
  // values, so hand-written memoization would just be redundant.
  function setTheme(next: Theme) {
    setThemeState(next);
  }
  function toggleTheme() {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/** Inline, render-blocking script string — sets the class before hydration
 * so there is no flash of the wrong theme. Injected via a <script> tag in
 * the root layout. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem("${STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`;
