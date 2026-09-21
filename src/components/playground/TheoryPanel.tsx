"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { usePlayground } from "@/context/playground-context";

/**
 * A live, WYSIWYG-style markdown editor for lesson notes — typing "# ",
 * "- ", "1. ", "> ", "**bold**", etc. formats inline as you type, the same
 * way Claude's own message composer behaves. This intentionally isn't a
 * split raw-markdown + rendered-preview editor; there's only one surface,
 * and it's always showing the formatted result.
 */
export function TheoryPanel() {
  const { state, actions } = usePlayground();

  const editor = useEditor({
    // Required in Next.js: Tiptap renders on the client only, to avoid an
    // SSR/hydration mismatch on the first paint.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          "Write your lesson notes here — try \"# \" for a heading, \"- \" for a bullet list, or \"1. \" for a numbered list…",
      }),
    ],
    content: state.theory,
    onUpdate: ({ editor: instance }) => {
      actions.setTheory(instance.getHTML());
    },
  });

  return (
    <div className="theory-editor bg-editor">
      <EditorContent editor={editor} />
    </div>
  );
}
