import type {
  Completion,
  CompletionResult,
  CompletionSource,
} from "@codemirror/autocomplete";
import { cssCompletionSource, cssLanguage } from "@codemirror/lang-css";
import { LanguageSupport } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";

// @codemirror/lang-css doesn't export a way to customize just the
// property-completion behavior, so we wrap its completion source: picking
// a *property* (e.g. "color") inserts "color: ;" with the cursor placed
// between the colon and the semicolon — matching VS Code's CSS completion
// behavior — instead of just inserting "color: " with nothing after it.
const vscodeStylePropertyCompletion: CompletionSource = async (context) => {
  const result: CompletionResult | null = await cssCompletionSource(context);
  if (!result) return result;

  const options: Completion[] = result.options.map((option) => {
    if (option.type !== "property") return option;

    return {
      ...option,
      apply: (view: EditorView, completion: Completion, from: number, to: number) => {
        const insert = `${completion.label}: ;`;
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + completion.label.length + 2 },
        });
      },
    };
  });

  return { ...result, options };
};

/** Drop-in replacement for @codemirror/lang-css's `css()` that keeps all
 * the same language support but swaps in the VS Code-style property
 * completion behavior above. */
export function cssWithVscodeCompletion() {
  return new LanguageSupport(
    cssLanguage,
    cssLanguage.data.of({ autocomplete: vscodeStylePropertyCompletion }),
  );
}
