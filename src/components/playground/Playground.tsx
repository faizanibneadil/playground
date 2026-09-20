"use client";

import { useEffect } from "react";
import { Panel, Group } from "react-resizable-panels";

import { usePlaygroundStore } from "@/store/playground-store";
import { Header } from "./Header";
import { EditorPanel } from "./EditorPanel";
import { PreviewPanel } from "./PreviewPanel";
import { ConsolePanel } from "./ConsolePanel";
import { TheoryPanel } from "./TheoryPanel";
import { ResizeHandle } from "./ResizeHandle";

export function Playground() {
  const mainView = usePlaygroundStore((s) => s.mainView);
  const hydrateFromStorage = usePlaygroundStore((s) => s.hydrateFromStorage);
  const run = usePlaygroundStore((s) => s.run);

  useEffect(() => {
    hydrateFromStorage();
    run();
    // Runs once on mount to restore any previously auto-saved work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />

      <div className="min-h-0 flex-1">
        {mainView === "theory" ? (
          <TheoryPanel />
        ) : (
          <Group  >
            <Panel defaultSize={50} minSize={20}>
              <EditorPanel />
            </Panel>
            <ResizeHandle direction="horizontal" />
            <Panel defaultSize={50} minSize={20}>
              <Group>
                <Panel defaultSize={70} minSize={15}>
                  <PreviewPanel />
                </Panel>
                <ResizeHandle direction="vertical" />
                <Panel defaultSize={30} minSize={10}>
                  <ConsolePanel />
                </Panel>
              </Group>
            </Panel>
          </Group>
        )}
      </div>
    </div>
  );
}
