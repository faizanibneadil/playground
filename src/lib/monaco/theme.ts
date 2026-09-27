import type { Monaco } from "@monaco-editor/react";

/** Resolves a CSS custom property (oklch, hex, whatever) to a concrete
 * rgb()/rgba() string — Monaco's theme colors need a literal value, not a
 * var() reference. Reads whatever is *currently* active on <html> (light
 * or dark), since both palettes share the same variable names. */
function resolveCssVar(name: string): string {
  if (typeof document === "undefined") return "#1e1e1e";
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  probe.style.position = "fixed";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  return resolved || "#1e1e1e";
}

/** Defines/redefines a single "app" Monaco theme from the app's current
 * CSS custom properties and switches every mounted editor to it. Called
 * again on every theme toggle rather than pre-baking two static palettes,
 * since light/dark values live under the same variable names and can only
 * be read one mode at a time from the live DOM. */
export function applyMonacoTheme(monaco: Monaco, mode: "dark" | "light") {
  monaco.editor.defineTheme("app", {
    base: mode === "dark" ? "vs-dark" : "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": resolveCssVar("--color-editor"),
      "editorGutter.background": resolveCssVar("--color-editor-gutter"),
      "editorLineNumber.foreground": resolveCssVar("--color-muted-foreground"),
      "editorLineNumber.activeForeground": resolveCssVar("--color-foreground"),
      "editorSuggestWidget.background": resolveCssVar("--color-popover"),
      "editorSuggestWidget.border": resolveCssVar("--color-border"),
      "editorSuggestWidget.selectedBackground": resolveCssVar("--color-accent"),
      "editorSuggestWidget.selectedForeground": resolveCssVar("--color-accent-foreground"),
    },
  });
  monaco.editor.setTheme("app");
}