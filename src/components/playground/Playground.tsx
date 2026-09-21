"use client";

import { Eye, Terminal } from "lucide-react";
import dynamic from "next/dynamic";
import { Group, Panel } from "react-resizable-panels";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { usePlayground } from "@/context/playground-context";
import { useIsMobile } from "@/hooks/use-media-query";
import { ConsolePanel } from "./ConsolePanel";
import { EditorPanel } from "./EditorPanel";
import { Header } from "./Header";
import { PreviewPanel } from "./PreviewPanel";
import { ResizeHandle } from "./ResizeHandle";

// Tiptap (the rich-text editor, ProseMirror, StarterKit's node/mark set)
// only matters once someone opens the Theory tab, so it's loaded on
// demand rather than bundled into the initial JS for the Practical view.
const TheoryPanel = dynamic(
  () => import("./TheoryPanel").then((mod) => mod.TheoryPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
);

// The header is a fixed-height Panel (not user-resizable — there's no
// Separator below it) on every device. On mobile its "more options" now
// live behind a drawer (see Header.tsx) rather than growing the header's
// own height, so there's nothing to expand/collapse here anymore.
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
        <Header isMobile={isMobile} />
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
