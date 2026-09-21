"use client";

import { useRef } from "react";
import { Sparkles } from "lucide-react";

import { usePlayground, type FileKey } from "@/context/playground-context";
import { CodeEditor, type CodeEditorHandle } from "./CodeEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EditorLanguage } from "@/lib/format-code";

const FILE_TABS: { key: FileKey; label: string; language: EditorLanguage; dotClass: string }[] = [
  { key: "html", label: "index.html", language: "html", dotClass: "bg-html-accent" },
  { key: "css", label: "style.css", language: "css", dotClass: "bg-css-accent" },
  { key: "js", label: "script.js", language: "javascript", dotClass: "bg-js-accent" },
];

export function EditorPanel() {
  const { state, actions } = usePlayground();
  const { activeFile, files } = state;

  const editorRefs = useRef<Partial<Record<FileKey, CodeEditorHandle | null>>>({});

  return (
    <section className="flex h-full min-w-0 flex-col bg-editor">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-panel pr-2">
        <div className="flex h-full">
          {FILE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                actions.setActiveFile(tab.key);
                requestAnimationFrame(() => editorRefs.current[tab.key]?.refresh());
              }}
              className={cn(
                "relative flex items-center gap-2 px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                tab.key === activeFile && "text-foreground"
              )}
            >
              <span className={cn("size-1.5 rounded-full", tab.dotClass)} />
              {tab.label}
              {tab.key === activeFile && (
                <span
                  className={cn("absolute inset-x-3 -bottom-px h-0.5 rounded-full", tab.dotClass)}
                />
              )}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          title="Format document (Shift+Alt+F)"
          onClick={() => editorRefs.current[activeFile]?.format()}
        >
          <Sparkles className="size-3" />
          Format
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        {FILE_TABS.map((tab) => (
          <div
            key={tab.key}
            className={cn(
              "absolute inset-0",
              tab.key === activeFile ? "block" : "hidden"
            )}
          >
            <CodeEditor
              ref={(handle) => {
                editorRefs.current[tab.key] = handle;
              }}
              language={tab.language}
              value={files[tab.key]}
              onChange={(value) => actions.setFileContent(tab.key, value)}
              className="h-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
