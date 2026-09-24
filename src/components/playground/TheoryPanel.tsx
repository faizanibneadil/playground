"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";
import StarterKit from "@tiptap/starter-kit";

import { usePlayground } from "@/context/playground-context";
import { lowlight } from "@/lib/lowlight-instance";
import { SmartCodeIndent } from "@/lib/tiptap/smart-code-indent";

export function TheoryPanel() {
  const { state, actions } = usePlayground();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        enableTabIndentation: true,
        tabSize: 2,
      }),
      SmartCodeIndent,
      Placeholder.configure({
        placeholder:
          'Write your lesson notes here — try "# " for a heading, "- " for a bullet list, or "1. " for a numbered list…',
      }),
    ],
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

  // `content` above only seeds the editor once, at creation — it doesn't
  // react to state.theory changing afterwards (e.g. once a shared
  // playground's saved theory arrives from the API). Sync it explicitly
  // whenever the two drift apart; the equality check skips this while the
  // user themself is typing, since editor.getHTML() already matches
  // state.theory in that case.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === state.theory) return;
    editor.commands.setContent(state.theory, { emitUpdate: false });
  }, [editor, state.theory]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-editor">
      <div className="mx-auto flex w-full max-w-[37em] flex-1 flex-col px-6 py-10 sm:px-10">
        <EditorContent editor={editor} className="flex flex-1 flex-col" />
      </div>
    </div>
  );
}