"use client";

import { Settings2, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { type FileKey, usePlayground } from "@/context/playground-context";
import type { EditorLanguage } from "@/lib/format-code";
import { cn } from "@/lib/utils";
import type { CodeEditorHandle } from "./CodeEditor";

// CodeMirror (language packages, the VS Code theme, Prettier's parsers)
// is one of the heaviest dependencies in this app. Loading it lazily,
// client-side only, keeps it out of the initial JS the browser has to
// parse before anything on screen is interactive.
const CodeEditor = dynamic(() => import("./CodeEditor").then((mod) => mod.CodeEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Loading editor…
    </div>
  ),
});

const FILE_TABS: {
  key: FileKey;
  label: string;
  language: EditorLanguage;
  dotClass: string;
}[] = [
  { key: "html", label: "index.html", language: "html", dotClass: "bg-html-accent" },
  { key: "css", label: "style.css", language: "css", dotClass: "bg-css-accent" },
  { key: "js", label: "script.js", language: "javascript", dotClass: "bg-js-accent" },
];

export function EditorPanel() {
  const { state, actions } = usePlayground();
  const { activeFile, files } = state;
  const [lineWrap, setLineWrap] = useState(true);

  const editorRefs = useRef<Partial<Record<FileKey, CodeEditorHandle | null>>>({});

  return (
    <section className="flex h-full min-w-0 flex-col bg-editor">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-panel pr-2">
        <div className="flex h-full">
          {FILE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                actions.setActiveFile(tab.key);
                requestAnimationFrame(() => editorRefs.current[tab.key]?.refresh());
              }}
              className={cn(
                "relative flex items-center gap-2 px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                tab.key === activeFile && "text-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full", tab.dotClass)} />
              {tab.label}
              {tab.key === activeFile && (
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-px h-0.5 rounded-full",
                    tab.dotClass,
                  )}
                />
              )}
            </button>
          ))}
        </div>

        <Popover>
          <PopoverTrigger
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Editor settings"
          >
            <Settings2 className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <button
              type="button"
              onClick={() => editorRefs.current[activeFile]?.format()}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
            >
              <Sparkles className="size-3.5 text-muted-foreground" />
              Format document
              <span className="ml-auto text-[10px] text-muted-foreground">⇧⌥F</span>
            </button>
            <div className="my-1 h-px bg-border" />
            <Label
              htmlFor="line-wrap"
              className="flex items-center justify-between px-2 py-1.5"
            >
              Line wrap
              <Switch
                id="line-wrap"
                checked={lineWrap}
                onCheckedChange={(checked) => setLineWrap(checked)}
              />
            </Label>
          </PopoverContent>
        </Popover>
      </div>

      <div className="relative min-h-0 flex-1">
        {FILE_TABS.map((tab) => (
          <div
            key={tab.key}
            className={cn(
              "absolute inset-0",
              tab.key === activeFile ? "block" : "hidden",
            )}
          >
            <CodeEditor
              ref={(handle) => {
                editorRefs.current[tab.key] = handle;
              }}
              language={tab.language}
              value={files[tab.key]}
              onChange={(value) => actions.setFileContent(tab.key, value)}
              lineWrap={lineWrap}
              className="h-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
