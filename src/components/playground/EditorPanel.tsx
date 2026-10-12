"use client";

import { Settings2, Sparkles, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { usePlayground } from "@/context/playground-context";
import { findNode } from "@/lib/file-tree";
import { cn } from "@/lib/utils";
import type { CodeEditorHandle } from "./CodeEditor";
import { FileIcon } from "./FileIcon";

// Monaco (language services, Prettier's parsers) is one of the heaviest
// dependencies in this app. Loading it lazily, client-side only, keeps it out
// of the initial JS the browser has to parse before anything is interactive.
const CodeEditor = dynamic(() => import("./CodeEditor").then((mod) => mod.CodeEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Loading editor…
    </div>
  ),
});

export function EditorPanel() {
  const { state, actions } = usePlayground();
  const { nodes, openFileIds, activeFileId } = state;
  const [lineWrap, setLineWrap] = useState(true);
  const editorRef = useRef<CodeEditorHandle | null>(null);
  const activeTabRef = useRef<HTMLDivElement | null>(null);

  const activeNode = findNode(nodes, activeFileId);
  const activeFile = activeNode?.type === "file" ? activeNode : null;

  // Keep the active tab visible when many tabs overflow the tab bar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeFileId is the trigger; the ref is read inside.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeFileId]);

  return (
    <section className="flex h-full min-w-0 flex-col bg-editor">
      <div className="flex h-9 shrink-0 items-stretch border-b border-border bg-panel">
        <div
          role="tablist"
          aria-label="Open files"
          className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {openFileIds.map((id) => {
            const node = findNode(nodes, id);
            if (node?.type !== "file") return null;
            const isActive = id === activeFileId;
            return (
              <div
                key={id}
                ref={isActive ? activeTabRef : undefined}
                role="presentation"
                // Middle click closes a tab, as in VS Code.
                onAuxClick={(event) => {
                  if (event.button === 1) {
                    event.preventDefault();
                    actions.closeFile(id);
                  }
                }}
                className={cn(
                  "group relative flex shrink-0 items-center border-r border-border text-xs",
                  isActive
                    ? "bg-editor text-foreground"
                    : "bg-panel text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive && (
                  <span className="absolute inset-x-0 top-0 h-px bg-primary" />
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => actions.openFile(id)}
                  className="flex h-full items-center gap-1.5 pr-1 pl-3 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <FileIcon name={node.name} />
                  <span className="max-w-40 truncate">{node.name}</span>
                </button>
                <button
                  type="button"
                  title="Close"
                  aria-label={`Close ${node.name}`}
                  onClick={() => actions.closeFile(id)}
                  className={cn(
                    "mr-1.5 ml-0.5 flex size-5 items-center justify-center rounded-sm hover:bg-accent",
                    !isActive &&
                      "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                  )}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <Popover>
          <PopoverTrigger
            className="mx-1 my-auto flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Editor settings"
          >
            <Settings2 className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <button
              type="button"
              disabled={activeFile === null}
              onClick={() => void editorRef.current?.format()}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent disabled:opacity-50"
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
        {activeFile ? (
          <CodeEditor
            ref={editorRef}
            fileId={activeFile.id}
            fileName={activeFile.name}
            value={activeFile.content}
            onChange={(value) => actions.setFileContent(activeFile.id, value)}
            openFileIds={openFileIds}
            lineWrap={lineWrap}
            className="h-full"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-sm text-foreground">No file is open</p>
            <p className="text-xs text-muted-foreground">
              Pick a file from the Files panel, or create a new one.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
