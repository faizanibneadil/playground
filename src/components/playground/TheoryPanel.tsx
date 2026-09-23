"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { usePlayground } from "@/context/playground-context";
import { lowlight } from "@/lib/lowlight-instance";
import { SmartCodeIndent } from "@/lib/tiptap/smart-code-indent";

/**
 * A live, WYSIWYG-style markdown editor for lesson notes — typing "# ",
 * "- ", "1. ", "> ", "**bold**", etc. formats inline as you type, the same
 * way Claude's own message composer behaves. This intentionally isn't a
 * split raw-markdown + rendered-preview editor; there's only one surface,
 * and it's always showing the formatted result.
 *
 * Typography comes entirely from shadcn/typeset (see globals.css and
 * typeset.css) via the `typeset typeset-docs` classes below — no
 * bespoke CSS for headings/lists/code lives in this app. Code blocks
 * (```ts, ```css, ```html, ...) get real syntax highlighting via
 * CodeBlockLowlight — see lowlight-instance.ts for the registered
 * languages, and globals.css for the `.hljs-*` token colors.
 */
export function TheoryPanel() {
  const { state, actions } = usePlayground();

  const editor = useEditor({
    // Required in Next.js: Tiptap renders on the client only, to avoid an
    // SSR/hydration mismatch on the first paint.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // StarterKit's own plain CodeBlock is replaced by the
        // syntax-highlighted one below — the ``` input rule (and the
        // language after it) still works the same way.
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        // Off by default in Tiptap: without this, Tab/Shift-Tab inside a
        // code block just moves focus out instead of indenting/dedenting
        // the current line(s).
        enableTabIndentation: true,
        tabSize: 2,
      }),
      // Must come after CodeBlockLowlight so CodeBlock's own Enter
      // handler (triple-Enter-to-exit the block) gets first refusal —
      // this only fires when that one doesn't apply. See the file for
      // exactly what it does.
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
        // "tiptap" is included explicitly (not just relying on Tiptap's
        // own default) because our placeholder and syntax-highlighting
        // CSS below is scoped under `.tiptap` — this guarantees it always
        // matches regardless of how attributes.class gets merged.
        class: "tiptap typeset typeset-docs max-w-[37em] focus:outline-none",
      },
    },
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-editor">
      <div className="mx-auto flex w-full max-w-[37em] flex-1 flex-col px-6 py-10 sm:px-10">
        <EditorContent editor={editor} className="flex flex-1 flex-col" />
      </div>
    </div>
  );
}