import type { editor } from "monaco-editor";

const TAG_NAME_RE = /^[a-zA-Z][a-zA-Z0-9:_.-]*$/;

interface ScannedTag {
  name: string;
  isClose: boolean;
  selfClose: boolean;
  nameStart: number;
  nameEnd: number;
}

function scanTags(text: string): ScannedTag[] {
  const re = /<\/?([a-zA-Z][a-zA-Z0-9:_.-]*)(?:\s[^<>]*?)?\/?>/g;
  const tags: ScannedTag[] = [];
  let m: RegExpExecArray | null = re.exec(text);
  while (m) {
    const isClose = m[0][1] === "/";
    const selfClose = m[0].endsWith("/>");
    const nameStart = m.index + (isClose ? 2 : 1);
    tags.push({ name: m[1], isClose, selfClose, nameStart, nameEnd: nameStart + m[1].length });
    m = re.exec(text);
  }
  return tags;
}

function findMatch(tags: ScannedTag[], idx: number): ScannedTag | null {
  if (idx === -1 || tags[idx].selfClose) return null;
  const stack: { tag: ScannedTag; i: number }[] = [];
  for (let i = 0; i < tags.length; i++) {
    const t = tags[i];
    if (t.selfClose) continue;
    if (!t.isClose) {
      stack.push({ tag: t, i });
    } else {
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].tag.name === t.name) {
          const opened = stack[k];
          stack.length = k;
          if (i === idx) return opened.tag;
          if (opened.i === idx) return t;
          break;
        }
      }
    }
  }
  return null;
}

/** Mirrors VS Code's "linked editing" for HTML: renaming an opening tag
 * updates its matching closing tag automatically, and vice versa. A
 * regex/offset-based stand-in for the old CodeMirror version, which used
 * a Lezer syntax tree Monaco doesn't expose the same way. */
export function registerTagRenameSync(editorInstance: editor.IStandaloneCodeEditor) {
  let syncing = false;

  return editorInstance.onDidChangeModelContent((e) => {
    if (syncing) return;
    if (e.changes.length !== 1) return;
    const change = e.changes[0];
    if (change.text !== "" && !TAG_NAME_RE.test(change.text)) return;

    const model = editorInstance.getModel();
    const position = editorInstance.getPosition();
    if (!model || !position) return;

    const text = model.getValue();
    const offset = model.getOffsetAt(position);
    const tags = scanTags(text);

    const editedIdx = tags.findIndex((t) => offset >= t.nameStart && offset <= t.nameEnd);
    if (editedIdx === -1) return;
    const edited = tags[editedIdx];
    const editedName = text.slice(edited.nameStart, edited.nameEnd);

    const other = findMatch(tags, editedIdx);
    if (!other || other.name === editedName) return;

    const startPos = model.getPositionAt(other.nameStart);
    const endPos = model.getPositionAt(other.nameEnd);

    syncing = true;
    try {
      editorInstance.executeEdits("tagRenameSync", [
        {
          range: {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          },
          text: editedName,
        },
      ]);
    } finally {
      syncing = false;
    }
  });
}