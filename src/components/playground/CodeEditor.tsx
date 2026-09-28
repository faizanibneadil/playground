"use client";

import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { useTheme } from "@/context/theme-context";
import { type EditorLanguage, formatCode } from "@/lib/format-code";
import { registerAutoCloseTag } from "@/lib/monaco/auto-close-tag";
import { registerTagRenameSync } from "@/lib/monaco/tag-rename-sync";
import { applyMonacoTheme } from "@/lib/monaco/theme";

export interface CodeEditorHandle {
  format: () => Promise<void>;
  refresh: () => void;
  focus: () => void;
}

interface CodeEditorProps {
  language: EditorLanguage;
  value: string;
  onChange: (value: string) => void;
  lineWrap?: boolean;
  className?: string;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor({ language, value, onChange, lineWrap = true, className }, ref) {
    const { theme } = useTheme();
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // useImperativeHandle needs a genuinely stable callback identity to
    // know when to rebuild the exposed handle.
    const format = useCallback(async () => {
      const ed = editorRef.current;
      const model = ed?.getModel();
      if (!ed || !model) return;
      try {
        const formatted = await formatCode(model.getValue(), language);
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: formatted }],
          () => null,
        );
        onChangeRef.current(formatted);
      } catch {
        // Invalid syntax can't be formatted — leave the editor content as-is.
      }
    }, [language]);

    useImperativeHandle(
      ref,
      () => ({
        format,
        refresh: () => {
          requestAnimationFrame(() => editorRef.current?.layout());
        },
        focus: () => editorRef.current?.focus(),
      }),
      [format],
    );

    useEffect(() => {
      if (!monacoRef.current) return;
      applyMonacoTheme(monacoRef.current, theme);
    }, [theme]);

    useEffect(() => {
      editorRef.current?.updateOptions({ wordWrap: lineWrap ? "on" : "off" });
    }, [lineWrap]);

    return (
      <Editor
        className={className}
        language={language}
        value={value}
        theme="app"
        onChange={(v) => onChangeRef.current(v ?? "")}
        options={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: 21,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: lineWrap ? "on" : "off",
          bracketPairColorization: { enabled: true },
          renderLineHighlight: "all",
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoIndent: "full",
          matchBrackets: "always",
          quickSuggestions: { other: true, comments: false, strings: true },
          suggestOnTriggerCharacters: true,
          folding: true,
          showFoldingControls: "mouseover",
          // Turns on Monaco's native "Auto Rename Tag" UI — the syncing
          // logic comes from the LinkedEditingRangeProvider registered in
          // onMount (html only; harmless no-op for css/js).
          linkedEditing: true,
          // Required for the auto-close-tag on-type provider to fire at
          // all. Only html needs it; css/js would start auto-reformatting
          // on ";" / "}".
          formatOnType: language === "html",
        }}
        beforeMount={(monaco) => {
          applyMonacoTheme(monaco, theme);
          // DOM globals (document, console, ...) for JS suggestions/diagnostics.
          monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            lib: ["es2020", "dom"],
          });
        }}
        onMount={(editorInstance, monaco) => {
          editorRef.current = editorInstance;
          monacoRef.current = monaco;

          // Re-registering this exact action id shadows Monaco's own
          // built-in formatter with our Prettier-backed one, on the same
          // Shift+Alt+F shortcut it already owns.
          editorInstance.addAction({
            id: "editor.action.formatDocument",
            label: "Format Document",
            keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
            run: () => {
              void format();
            },
          });

          if (language === "html") {
            registerAutoCloseTag(monaco, editorInstance, "html");
            registerTagRenameSync(monaco, "html");
          }
        }}
      />
    );
  },
);