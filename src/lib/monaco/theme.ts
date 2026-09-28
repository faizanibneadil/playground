import type { Monaco } from "@monaco-editor/react";

/** Resolves a CSS custom property (oklch, lab, hex, whatever) to a
 * Monaco-safe "#rrggbb" / "rgba(...)" string. getComputedStyle() — and
 * even a canvas `fillStyle` round-trip — can still hand back a
 * lab()/oklch() string on wide-gamut colors in newer Chrome, and Monaco's
 * theme parser only understands hex/rgba. Actually *painting* the color
 * onto a 1x1 canvas and reading the raw pixel bytes back via
 * getImageData() always yields plain, clamped 0-255 sRGB numbers,
 * regardless of the source color space. */
function resolveCssVar(name: string): string {
  if (typeof document === "undefined") return "#1e1e1e";

  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const raw = getComputedStyle(probe).color;
  document.body.removeChild(probe);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return raw;

    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);

    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const hex = (n: number) => n.toString(16).padStart(2, "0");
    return a === 255
      ? `#${hex(r)}${hex(g)}${hex(b)}`
      : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  } catch {
    return raw;
  }
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