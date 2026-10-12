"use client";

import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useTheme } from "@/context/theme-context";
import { getFormatLanguage, getMonacoLanguage } from "@/lib/file-tree";
import { formatCode } from "@/lib/format-code";
import { registerAutoCloseTag } from "@/lib/monaco/auto-close-tag";
import { registerTagRenameSync } from "@/lib/monaco/tag-rename-sync";
import { applyMonacoTheme } from "@/lib/monaco/theme";
import { cn } from "@/lib/utils";

export interface CodeEditorHandle {
  format: () => Promise<void>;
  focus: () => void;
}

interface CodeEditorProps {
  /** Stable id of the open file. Each id gets its own Monaco model, so undo
   * history, cursor and scroll position survive switching between tabs. */
  fileId: string;
  fileName: string;
  value: string;
  onChange: (value: string) => void;
  /** Ids of the files that still have a tab; models of every other file are disposed. */
  openFileIds: readonly string[];
  lineWrap?: boolean;
  className?: string;
}

const MODEL_PATH_PREFIX = "file:///";

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    { fileId, fileName, value, onChange, openFileIds, lineWrap = true, className },
    ref,
  ) {
    const { theme } = useTheme();
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);

    const language = getMonacoLanguage(fileName);
    const formatLanguage = getFormatLanguage(fileName);

    // The Shift+Alt+F action is registered once on mount, so it reads the
    // currently open file through refs instead of closing over stale props.
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const formatLanguageRef = useRef(formatLanguage);
    formatLanguageRef.current = formatLanguage;

    async function format() {
      const ed = editorRef.current;
      const model = ed?.getModel();
      const target = formatLanguageRef.current;
      if (!ed || !model || target === null) return;
      try {
        const formatted = await formatCode(model.getValue(), target);
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: formatted }],
          () => null,
        );
        onChangeRef.current(formatted);
      } catch {
        // Invalid syntax can't be formatted — leave the editor content as-is.
      }
    }
    const formatRef = useRef(format);
    formatRef.current = format;

    useImperativeHandle(ref, () => ({
      format: () => formatRef.current(),
      focus: () => editorRef.current?.focus(),
    }));

    useEffect(() => {
      if (!monacoRef.current) return;
      applyMonacoTheme(monacoRef.current, theme);
    }, [theme]);

    useEffect(() => {
      editorRef.current?.updateOptions({ wordWrap: lineWrap ? "on" : "off" });
    }, [lineWrap]);

    // "formatOnType" is what makes the auto-close-tag provider fire, but it
    // would start reformatting CSS/JS on ";" and "}", so it's HTML-only.
    useEffect(() => {
      editorRef.current?.updateOptions({ formatOnType: language === "html" });
    }, [language]);

    // Closing a tab (or deleting a file) drops its model, like VS Code does.
    useEffect(() => {
      const monaco = monacoRef.current;
      if (!monaco) return;
      const live = new Set(openFileIds.map((id) => `/${id}`));
      for (const model of monaco.editor.getModels()) {
        if (model.uri.scheme === "file" && !live.has(model.uri.path)) model.dispose();
      }
    }, [openFileIds]);

    return (
      <Editor
        className={cn("h-full w-full", className)}
        height="100%"
        width="100%"
        path={`${MODEL_PATH_PREFIX}${fileId}`}
        language={language}
        value={value}
        theme="app"
        loading={
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Loading editor…
          </div>
        }
        onChange={(v) => onChangeRef.current(v ?? "")}
        options={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: 21,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          // Follows its container via ResizeObserver: panel drags, sidebar
          // collapse, mobile pane switches and orientation changes all work.
          automaticLayout: true,
          // Suggest/hover widgets render on <body>, so panel overflow can't clip them.
          fixedOverflowWidgets: true,
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
          // Turns on Monaco's native "Auto Rename Tag" UI — the syncing logic
          // comes from the LinkedEditingRangeProvider registered in onMount
          // (html only; harmless no-op for css/js).
          linkedEditing: true,
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

          // Re-registering this exact action id shadows Monaco's own built-in
          // formatter with our Prettier-backed one, on the same Shift+Alt+F
          // shortcut it already owns.
          editorInstance.addAction({
            id: "editor.action.formatDocument",
            label: "Format Document",
            keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
            run: () => {
              void formatRef.current();
            },
          });

          // Language-level providers: registered once, they apply to every
          // HTML model of the single editor instance.
          registerAutoCloseTag(monaco, editorInstance, "html");
          registerTagRenameSync(monaco, "html");
        }}
      />
    );
  },
);
