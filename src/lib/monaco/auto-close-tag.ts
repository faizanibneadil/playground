import type { Monaco } from "@monaco-editor/react";
import type { editor, languages } from "monaco-editor";

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

let disposable: { dispose: () => void } | null = null;

/** Typing the closing ">" of an opening tag inserts the matching "</tag>"
 * right after the cursor (skipped for self-closing tags and void
 * elements). Uses Monaco's on-type-formatting extension point, which only
 * fires when the editor has `formatOnType: true`. Monaco moves the cursor
 * to the end of an on-type edit, so we put it back between the tags. */
export function registerAutoCloseTag(
  monaco: Monaco,
  editorInstance: editor.IStandaloneCodeEditor,
  languageId: string,
) {
  disposable?.dispose();
  disposable = monaco.languages.registerOnTypeFormattingEditProvider(languageId, {
    autoFormatTriggerCharacters: [">"],
    provideOnTypeFormattingEdits(model:any, position:any): languages.TextEdit[] {
      const lineContent = model.getLineContent(position.lineNumber);
      const before = lineContent.slice(0, position.column - 1);
      if (before.endsWith("/")) return []; // self-closing "/>"

      const match = before.match(/<([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?$/);
      if (!match) return [];
      const tagName = match[1];
      if (VOID_TAGS.has(tagName.toLowerCase())) return [];

      // Runs after Monaco applies the edit and moves the cursor.
      setTimeout(() => editorInstance.setPosition(position), 0);

      return [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: `</${tagName}>`,
        },
      ];
    },
  });
  return disposable;
}