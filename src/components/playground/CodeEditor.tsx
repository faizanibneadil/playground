"use client";

import { useImperativeHandle, useCallback, useRef, forwardRef } from "react";
import CodeMirror, { EditorView, type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";

import { htmlTagSync } from "@/lib/codemirror/html-tag-sync";
import { cssWithVscodeCompletion } from "@/lib/codemirror/css-property-completion";
import { formatCode, type EditorLanguage } from "@/lib/format-code";
import { useTheme } from "@/context/theme-context";

export interface CodeEditorHandle {
  format: () => Promise<void>;
  refresh: () => void;
  focus: () => void;
}

interface CodeEditorProps {
  language: EditorLanguage;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function languageExtension(language: EditorLanguage) {
  switch (language) {
    case "html":
      return html({ autoCloseTags: true, matchClosingTags: true });
    case "css":
      return cssWithVscodeCompletion();
    case "javascript":
      return javascript({ jsx: false });
  }
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor({ language, value, onChange, className }, ref) {
    const cmRef = useRef<ReactCodeMirrorRef | null>(null);
    const { theme } = useTheme();

    // useImperativeHandle needs a genuinely stable callback identity to
    // know when to rebuild the exposed handle — that's a correctness
    // requirement of the hook itself, not a perf optimization, so this is
    // one of the few spots we memoize by hand instead of leaning on the
    // React Compiler.
    const format = useCallback(async () => {
      const view = cmRef.current?.view;
      if (!view) return;
      try {
        const formatted = await formatCode(view.state.doc.toString(), language);
        const cursor = view.state.selection.main.head;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
          selection: { anchor: Math.min(cursor, formatted.length) },
        });
        onChange(formatted);
      } catch {
        // Invalid syntax can't be formatted — leave the editor content as-is.
      }
    }, [language, onChange]);

    useImperativeHandle(
      ref,
      () => ({
        format,
        refresh: () => {
          const view = cmRef.current?.view;
          if (!view) return;
          requestAnimationFrame(() => view.requestMeasure());
        },
        focus: () => cmRef.current?.view?.focus(),
      }),
      [format]
    );

    const extensions = [
      languageExtension(language),
      indentUnit.of("  "),
      keymap.of([
        {
          key: "Shift-Alt-f",
          mac: "Shift-Alt-f",
          run: () => {
            void format();
            return true;
          },
        },
      ]),
      EditorView.lineWrapping,
    ];
    if (language === "html") {
      extensions.push(htmlTagSync());
    }

    return (
      <CodeMirror
        ref={cmRef}
        className={className}
        value={value}
        height="100%"
        theme={theme === "dark" ? vscodeDark : vscodeLight}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
          tabSize: 2,
        }}
        onChange={onChange}
      />
    );
  }
);
