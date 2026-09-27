import type { editor } from "monaco-editor";

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/** Mirrors the old CodeMirror "autoCloseTags" behavior: typing the closing
 * ">" of an opening tag inserts the matching "</tag>" right after the
 * cursor (skipped for self-closing tags and void elements). Monaco doesn't
 * ship this for HTML out of the box. */
export function registerAutoCloseTag(editorInstance: editor.IStandaloneCodeEditor) {
  return editorInstance.onDidChangeModelContent((e) => {
    if (e.changes.length !== 1) return;
    const change = e.changes[0];
    if (change.text !== ">") return;

    const model = editorInstance.getModel();
    const position = editorInstance.getPosition();
    if (!model || !position) return;

    const lineContent = model.getLineContent(position.lineNumber);
    const before = lineContent.slice(0, position.column - 1);
    if (before.endsWith("/")) return; // self-closing "/>"

    const match = before.match(/<([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?$/);
    if (!match) return;
    const tagName = match[1];
    if (VOID_TAGS.has(tagName.toLowerCase())) return;

    editorInstance.executeEdits("autoCloseTag", [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text: `</${tagName}>`,
      },
    ]);
    editorInstance.setPosition(position);
  });
}