import { foldGutter } from "@codemirror/language";

// Lucide's chevron-right / chevron-down paths, drawn directly as SVG so
// CodeMirror's fold gutter shows a proper icon instead of the library's
// default "›" / "⌄" text glyphs.
function chevronSvg(direction: "right" | "down"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "13");
  svg.setAttribute("height", "13");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", direction === "right" ? "m9 18 6-6-6-6" : "m6 9 6 6 6-6");
  svg.appendChild(path);
  return svg;
}

function foldMarker(open: boolean) {
  const wrapper = document.createElement("span");
  wrapper.className = "cm-foldMarker";
  wrapper.style.cssText =
    "display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--color-muted-foreground, currentColor);cursor:pointer;";
  wrapper.appendChild(chevronSvg(open ? "down" : "right"));
  return wrapper;
}

export function customFoldGutter() {
  return foldGutter({
    markerDOM: foldMarker,
  });
}
