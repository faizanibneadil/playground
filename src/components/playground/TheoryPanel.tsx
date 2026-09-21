"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { usePlayground } from "@/context/playground-context";

/**
 * A live, WYSIWYG-style markdown editor for lesson notes — typing "# ",
 * "- ", "1. ", "> ", "**bold**", etc. formats inline as you type, the same
 * way Claude's own message composer behaves. This intentionally isn't a
 * split raw-markdown + rendered-preview editor; there's only one surface,
 * and it's always showing the formatted result.
 *
 * Typography comes entirely from shadcn/typeset (see globals.css and
 * typeset.css) via the `typeset typeset-docs` classes below — no
 * bespoke CSS for headings/lists/code lives in this app anymore.
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
          'Write your lesson notes here — try "# " for a heading, "- " for a bullet list, or "1. " for a numbered list…',
      }),
    ],
    content: state.theory,
    onUpdate: ({ editor: instance }) => {
      actions.setTheory(instance.getHTML());
    },
    editorProps: {
      attributes: {
        class: "typeset typeset-docs max-w-[37em] focus:outline-none",
      },
    },
  });

  return (
    <div className="h-full overflow-y-auto bg-editor px-6 py-10 sm:px-10">
      <EditorContent editor={editor} className="mx-auto max-w-[37em]" />
    </div>
  );
}
