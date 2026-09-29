"use client";

import { BookOpen, Code, Eye, type LucideIcon, Terminal } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import { usePlayground } from "@/context/playground-context";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { ConsolePanel } from "./ConsolePanel";
import { EditorPanel } from "./EditorPanel";
import { Header } from "./Header";
import { PreviewPanel } from "./PreviewPanel";
import { ResizeHandle } from "./ResizeHandle";

// Tiptap (the rich-text editor, ProseMirror, StarterKit's node/mark set)
// only matters once someone opens the Theory tab, so it's loaded on
// demand rather than bundled into the initial JS for the Practical view.
const TheoryPanel = dynamic(() => import("./TheoryPanel").then((mod) => mod.TheoryPanel), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Loading editor…
    </div>
  ),
});

// The header is a fixed-height Panel (not user-resizable).
const HEADER_HEIGHT = 48;

export function Playground() {
  const { state } = usePlayground();
  const isMobile = useIsMobile();

  return (
    <Group orientation="vertical" className="h-dvh bg-background">
      <Panel
        id="header"
        defaultSize={HEADER_HEIGHT}
        minSize={HEADER_HEIGHT}
        maxSize={HEADER_HEIGHT}
        groupResizeBehavior="preserve-pixel-size"
      >
        <Header />
      </Panel>

      <Panel id="main-content" minSize={120}>
        {isMobile ? (
          <MobileView />
        ) : state.mainView === "theory" ? (
          <TheoryPanel />
        ) : (
          <DesktopPracticalView />
        )}
      </Panel>
    </Group>
  );
}

function DesktopPracticalView() {
  return (
    <Group orientation="horizontal" className="h-full">
      <Panel id="editor" defaultSize={50} minSize={20}>
        <EditorPanel />
      </Panel>
      <ResizeHandle direction="horizontal" />
      <Panel id="preview-console-column" defaultSize={50} minSize={20}>
        <Group orientation="vertical" className="h-full">
          <Panel id="preview" defaultSize={70} minSize={15}>
            <PreviewPanel />
          </Panel>
          <ResizeHandle direction="vertical" />
          <Panel id="console" defaultSize={30} minSize={10}>
            <ConsolePanel />
          </Panel>
        </Group>
      </Panel>
    </Group>
  );
}

type PracticalPane = "editor" | "preview" | "console";
type MobilePane = "theory" | PracticalPane;

const MOBILE_PANES: { id: MobilePane; label: string; icon: LucideIcon }[] = [
  { id: "theory", label: "Theory", icon: BookOpen },
  { id: "editor", label: "Editor", icon: Code },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "console", label: "Console", icon: Terminal },
];

/** Keeps a pane mounted (hidden ones are display:none) so the preview
 * iframe keeps running and console logs keep arriving while the student
 * is looking at a different pane. */
function PaneSlot({ active, children }: { active: boolean; children: ReactNode }) {
  return <div className={cn("absolute inset-0", !active && "hidden")}>{children}</div>;
}

/** Mobile layout: Theory, Editor, Preview and Console all live as tabs in
 * one bottom bar (the header only keeps the project name + right-side
 * tools — see Header.tsx). Theory shares `state.mainView` with the
 * desktop header tabs, so switching device width mid-session lands on
 * the same view; Editor/Preview/Console are a separate, mobile-only
 * sub-selection kept in local state. */
function MobileView() {
  const { state, actions } = usePlayground();
  const [practicalPane, setPracticalPane] = useState<PracticalPane>("editor");

  const isTheory = state.mainView === "theory";
  const activePane: MobilePane = isTheory ? "theory" : practicalPane;

  function selectPane(pane: MobilePane) {
    if (pane === "theory") {
      actions.setMainView("theory");
      return;
    }
    actions.setMainView("practical");
    setPracticalPane(pane);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        {isTheory ? (
          <TheoryPanel />
        ) : (
          <>
            <PaneSlot active={activePane === "editor"}>
              <EditorPanel />
            </PaneSlot>
            <PaneSlot active={activePane === "preview"}>
              <PreviewPanel />
            </PaneSlot>
            <PaneSlot active={activePane === "console"}>
              <ConsolePanel />
            </PaneSlot>
          </>
        )}
      </div>
      <nav
        aria-label="Playground view"
        className="flex h-12 shrink-0 items-center justify-around border-t border-border bg-panel"
      >
        {MOBILE_PANES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={activePane === id}
            onClick={() => selectPane(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
              activePane === id && "bg-accent text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}