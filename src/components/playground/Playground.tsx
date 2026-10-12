"use client";

import { BookOpen, Code, Eye, Files, type LucideIcon, Terminal } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Group, Panel, usePanelRef } from "react-resizable-panels";
import { type SidebarView, usePlayground } from "@/context/playground-context";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { ActivityBar } from "./ActivityBar";
import { ConsolePanel } from "./ConsolePanel";
import { EditorPanel } from "./EditorPanel";
import { Header } from "./Header";
import { PreviewPanel } from "./PreviewPanel";
import { ResizeHandle } from "./ResizeHandle";
import { Sidebar } from "./Sidebar";

export function Playground() {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />
      <div className="flex min-h-0 flex-1">
        {isMobile ? <MobileView /> : <DesktopView />}
      </div>
    </div>
  );
}

/** VS Code layout: activity bar | resizable sidebar (Files / Theory) | editor + preview/console. */
function DesktopView() {
  const { state, actions } = usePlayground();
  const view = state.sidebarView;
  const sidebarRef = usePanelRef();
  // Remembers which view to bring back when the sidebar is dragged open again.
  const lastViewRef = useRef<Exclude<SidebarView, null>>("files");

  useEffect(() => {
    if (view !== null) lastViewRef.current = view;
    const panel = sidebarRef.current;
    if (!panel) return;
    if (view === null) {
      if (!panel.isCollapsed()) panel.collapse();
    } else if (panel.isCollapsed()) {
      panel.expand();
    }
  }, [view, sidebarRef]);

  return (
    <>
      <ActivityBar />
      <div className="min-w-0 flex-1">
        <Group orientation="horizontal" className="h-full">
          <Panel
            id="sidebar"
            panelRef={sidebarRef}
            collapsible
            collapsedSize={0}
            defaultSize="22%"
            minSize="12%"
            maxSize="50%"
            onResize={(size) => {
              // Dragging the sidebar shut (or open) keeps the activity bar in sync.
              const collapsed = size.asPercentage === 0;
              if (collapsed && view !== null) actions.setSidebarView(null);
              else if (!collapsed && view === null)
                actions.setSidebarView(lastViewRef.current);
            }}
          >
            <Sidebar />
          </Panel>
          <ResizeHandle direction="horizontal" />
          <Panel id="workbench" defaultSize="78%" minSize="30%">
            <Group orientation="horizontal" className="h-full">
              <Panel id="editor" defaultSize="55%" minSize="20%">
                <EditorPanel />
              </Panel>
              <ResizeHandle direction="horizontal" />
              <Panel id="preview-console-column" defaultSize="45%" minSize="20%">
                <Group orientation="vertical" className="h-full">
                  <Panel id="preview" defaultSize="70%" minSize="15%">
                    <PreviewPanel />
                  </Panel>
                  <ResizeHandle direction="vertical" />
                  <Panel id="console" defaultSize="30%" minSize="10%">
                    <ConsolePanel />
                  </Panel>
                </Group>
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>
    </>
  );
}

type MobilePane = "files" | "theory" | "editor" | "preview" | "console";

const MOBILE_PANES: { id: MobilePane; label: string; icon: LucideIcon }[] = [
  { id: "files", label: "Files", icon: Files },
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

/** Mobile layout: the activity bar's Files/Theory views and the Editor,
 * Preview and Console all become tabs of one bottom bar. Files and Theory
 * share `state.sidebarView` with the desktop activity bar, so resizing the
 * window mid-session lands on the same view. */
function MobileView() {
  const { actions } = usePlayground();
  const [pane, setPane] = useState<MobilePane>("editor");

  function selectPane(next: MobilePane) {
    if (next === "files" || next === "theory") actions.setSidebarView(next);
    setPane(next);
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <PaneSlot active={pane === "files" || pane === "theory"}>
          <Sidebar onOpenFile={() => setPane("editor")} />
        </PaneSlot>
        <PaneSlot active={pane === "editor"}>
          <EditorPanel />
        </PaneSlot>
        <PaneSlot active={pane === "preview"}>
          <PreviewPanel />
        </PaneSlot>
        <PaneSlot active={pane === "console"}>
          <ConsolePanel />
        </PaneSlot>
      </div>
      <nav
        aria-label="Playground view"
        className="flex h-12 shrink-0 items-stretch justify-around border-t border-border bg-panel"
      >
        {MOBILE_PANES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={pane === id}
            onClick={() => selectPane(id)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground",
              pane === id && "bg-accent text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
