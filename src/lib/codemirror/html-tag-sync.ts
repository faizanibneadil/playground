import { syntaxTree } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";

const TAG_NAME_RE = /^[a-zA-Z][a-zA-Z0-9:_.-]*$/;

function findEnclosingTagName(root: SyntaxNode, pos: number): SyntaxNode | null {
  let node: SyntaxNode | null = root.resolveInner(pos, -1);
  while (node) {
    if (node.name === "TagName") return node;
    if (node.name === "Element" || node.name === "Document") return null;
    node = node.parent;
  }
  return null;
}

function findMatchingTagName(tagName: SyntaxNode): SyntaxNode | null {
  const tagNode = tagName.parent; // OpenTag or CloseTag
  if (!tagNode) return null;
  const isOpen = tagNode.name === "OpenTag";
  const isClose = tagNode.name === "CloseTag";
  if (!isOpen && !isClose) return null;

  const element = tagNode.parent;
  if (element?.name !== "Element") return null;

  let other: SyntaxNode | null = null;
  for (let child = element.firstChild; child; child = child.nextSibling) {
    if (isOpen && child.name === "CloseTag") {
      other = child;
      break;
    }
    if (isClose && child.name === "OpenTag") {
      other = child;
      break;
    }
  }
  if (!other) return null;

  for (let child = other.firstChild; child; child = child.nextSibling) {
    if (child.name === "TagName") return child;
  }
  return null;
}

/**
 * Mirrors VS Code's "linked editing" for HTML: renaming an opening tag
 * updates its matching closing tag automatically, and vice versa.
 */
export function htmlTagSync(): Extension {
  let syncing = false;

  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (syncing || !update.docChanged) return;

    const isTrackedEdit = update.transactions.some(
      (tr) => tr.isUserEvent("input") || tr.isUserEvent("delete"),
    );
    if (!isTrackedEdit) return;

    const state = update.state;
    const pos = state.selection.main.head;
    const tree = syntaxTree(state);

    const tagName = findEnclosingTagName(tree.topNode, pos);
    if (!tagName) return;

    const otherTagName = findMatchingTagName(tagName);
    if (!otherTagName) return;

    const currentText = state.doc.sliceString(tagName.from, tagName.to);
    const otherText = state.doc.sliceString(otherTagName.from, otherTagName.to);
    if (currentText === otherText) return;
    if (!TAG_NAME_RE.test(currentText)) return;

    syncing = true;
    try {
      update.view.dispatch({
        changes: {
          from: otherTagName.from,
          to: otherTagName.to,
          insert: currentText,
        },
      });
    } finally {
      syncing = false;
    }
  });
}
