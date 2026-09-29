"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import { usePlayground } from "@/context/playground-context";
import { lowlight } from "@/lib/lowlight-instance";
import { CodeBlockWithCopy } from "@/lib/tiptap/code-block-with-copy";
import { SmartCodeIndent } from "@/lib/tiptap/smart-code-indent";

// Module-level so the extension instances keep a stable identity across renders.
const EXTENSIONS = [
  StarterKit.configure({
    codeBlock: false,
    // StarterKit v3 bundles Link + Underline. Links always open in a new tab;
    // openOnClick is off so clicking a link while editing just places the caret
    // (read-only viewers get the native <a target="_blank"> behaviour).
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: "https",
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
    },
  }),
  CodeBlockWithCopy.configure({
    lowlight,
    enableTabIndentation: true,
    tabSize: 2,
  }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  SmartCodeIndent,
  Placeholder.configure({
    placeholder:
      'Write your lesson notes here — try "# " for a heading, "- " for a bullet list, "1. " for a numbered list, "> " for a quote, or "```" for a code block…',
  }),
];

export function TheoryPanel() {
  const { state, actions, isReadOnly } = usePlayground();

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isReadOnly,
    extensions: EXTENSIONS,
    content: state.theory,
    onUpdate: ({ editor: instance }) => {
      actions.setTheory(instance.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap typeset typeset-docs max-w-[37em] focus:outline-none",
      },
    },
  });

  // `content` and `editable` above only apply once, at creation — sync
  // both explicitly whenever they drift from the current context state
  // (e.g. once a shared playground's saved theory arrives from the API,
  // or once isReadOnly is known).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === state.theory) return;
    editor.commands.setContent(state.theory, { emitUpdate: false });
  }, [editor, state.theory]);

  useEffect(() => {
    editor?.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-editor">
      <div className="mx-auto flex w-full max-w-[37em] flex-1 flex-col px-6 py-10 sm:px-10">
        <EditorContent editor={editor} className="flex flex-1 flex-col" />
      </div>
    </div>
  );
}