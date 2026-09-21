"use client";

import { useState } from "react";
import { Group, Panel, usePanelRef } from "react-resizable-panels";
import { Eye, Terminal } from "lucide-react";

import { usePlayground } from "@/context/playground-context";
import { useIsMobile } from "@/hooks/use-media-query";
import { Header } from "./Header";
import { EditorPanel } from "./EditorPanel";
import { PreviewPanel } from "./PreviewPanel";
import { ConsolePanel } from "./ConsolePanel";
import { TheoryPanel } from "./TheoryPanel";
import { ResizeHandle } from "./ResizeHandle";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";

// Header sizes in pixels. On desktop the header is fixed (min = max =
// default) so it can never grow or shrink; on mobile it starts collapsed
// (just the "Playground" label + chevron) and only the chevron button —
// never a drag handle, since no Separator sits below it — can expand it
// to reveal the rest of the controls.
const HEADER_DESKTOP_SIZE = 48;
const HEADER_MOBILE_COLLAPSED = 44;
const HEADER_MOBILE_EXPANDED = 232;

export function Playground() {
  const { state } = usePlayground();
  const isMobile = useIsMobile();
  const headerPanelRef = usePanelRef();
  const [headerExpanded, setHeaderExpanded] = useState(false);

  function toggleHeader() {
    const panel = headerPanelRef.current;
    if (!panel) return;
    if (headerExpanded) {
      panel.resize(HEADER_MOBILE_COLLAPSED);
    } else {
      panel.resize(HEADER_MOBILE_EXPANDED);
    }
    setHeaderExpanded(!headerExpanded);
  }

  return (
    <Group orientation="vertical" className="h-dvh bg-background">
      <Panel
        id="header"
        panelRef={headerPanelRef}
        defaultSize={isMobile ? HEADER_MOBILE_COLLAPSED : HEADER_DESKTOP_SIZE}
        minSize={isMobile ? HEADER_MOBILE_COLLAPSED : HEADER_DESKTOP_SIZE}
        maxSize={isMobile ? HEADER_MOBILE_EXPANDED : HEADER_DESKTOP_SIZE}
        groupResizeBehavior="preserve-pixel-size"
      >
        <Header
          isMobile={isMobile}
          expanded={isMobile && headerExpanded}
          onToggleExpand={toggleHeader}
        />
      </Panel>

      <Panel id="main-content" minSize={120}>
        {state.mainView === "theory" ? (
          <TheoryPanel />
        ) : isMobile ? (
          <MobilePracticalView />
        ) : (
          <DesktopPracticalView />
        )}
      </Panel>
    </Group>
  );
}

function DesktopPracticalView() {
  return (
    <Group orientation="vertical" className="h-full">
      <Panel id="editor-preview-row" defaultSize={70} minSize={20}>
        <Group orientation="horizontal" className="h-full">
          <Panel id="editor" defaultSize={50} minSize={20}>
            <EditorPanel />
          </Panel>
          <ResizeHandle direction="horizontal" />
          <Panel id="preview" defaultSize={50} minSize={20}>
            <PreviewPanel />
          </Panel>
        </Group>
      </Panel>
      {/* The console spans the full width, below both the editor and the
          preview — not nested under the preview column. */}
      <ResizeHandle direction="vertical" />
      <Panel id="console" defaultSize={30} minSize={10}>
        <ConsolePanel />
      </Panel>
    </Group>
  );
}

function MobilePracticalView() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <EditorPanel />
      </div>
      <div className="flex h-12 shrink-0 items-center justify-around border-t border-border bg-panel">
        <Drawer>
          <DrawerTrigger className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            <Eye className="size-3.5" />
            Preview
          </DrawerTrigger>
          <DrawerContent title="Preview">
            <PreviewPanel />
          </DrawerContent>
        </Drawer>
        <Drawer>
          <DrawerTrigger className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            <Terminal className="size-3.5" />
            Console
          </DrawerTrigger>
          <DrawerContent title="Console">
            <ConsolePanel />
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
