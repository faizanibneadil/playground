"use client";

import { useState } from "react";
import { usePlayground } from "@/context/playground-context";
import { cn } from "@/lib/utils";
import { FileExplorer } from "./FileExplorer";
import { LazyTheoryPanel } from "./LazyTheoryPanel";

/** Content of the primary sidebar. Both views stay mounted once opened (just
 * hidden), so switching between them never loses explorer expansion state,
 * the theory editor's undo history or its scroll position. */
export function Sidebar({ onOpenFile }: { onOpenFile?: () => void }) {
  const { state } = usePlayground();
  const view = state.sidebarView;

  // Tiptap is only loaded the first time Theory is opened.
  const [theoryOpened, setTheoryOpened] = useState(false);
  if (view === "theory" && !theoryOpened) setTheoryOpened(true);

  return (
    <aside className="relative h-full min-w-0 overflow-hidden bg-panel">
      <div className={cn("absolute inset-0", view === "theory" && "hidden")}>
        <FileExplorer onOpenFile={onOpenFile} />
      </div>
      {theoryOpened && (
        <div
          className={cn("absolute inset-0 flex flex-col", view !== "theory" && "hidden")}
        >
          <div className="flex h-9 shrink-0 items-center px-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Theory
          </div>
          <div className="min-h-0 flex-1">
            <LazyTheoryPanel />
          </div>
        </div>
      )}
    </aside>
  );
}
