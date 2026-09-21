import { EditorView } from "@codemirror/view";

/**
 * Fixes two default CodeMirror autocomplete styles that read poorly in a
 * themed app: the matched-substring underline, and the lack of a visible
 * background on the focused/selected suggestion.
 */
export const autocompleteTooltipTheme = EditorView.theme({
  ".cm-tooltip.cm-tooltip-autocomplete": {
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    padding: "4px",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    borderRadius: "5px",
    padding: "3px 6px",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
    background: "var(--color-accent) !important",
    color: "var(--color-accent-foreground) !important",
  },
  ".cm-completionMatchedText": {
    textDecoration: "none",
    fontWeight: "600",
  },
  ".cm-completionDetail": {
    fontStyle: "normal",
    opacity: 0.6,
  },
});
