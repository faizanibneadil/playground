"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePlayground } from "@/context/playground-context";
import { buildPreviewDocument } from "@/lib/preview-document";

const REFRESH_DEBOUNCE_MS = 400;

export function PreviewPanel() {
  const { state, actions } = usePlayground();
  const { files, runVersion } = state;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [srcDoc, setSrcDoc] = useState("");
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  // Re-run whenever the files change, or "Run" is pressed (runVersion bump).
  // `actions` is stable in practice (see PlaygroundProvider) and
  // deliberately left out so this effect isn't keyed to context identity.
  // biome-ignore lint/correctness/useExhaustiveDependencies: actions.clearLogs is stable in practice and deliberately omitted, see comment above.
  useEffect(() => {
    const timer = setTimeout(
      () => {
        actions.clearLogs();
        setSrcDoc(buildPreviewDocument(files.html, files.css, files.js));
        setLastRunAt(new Date());
      },
      runVersion === 0 ? 0 : REFRESH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.html, files.css, files.js, runVersion]);

  // Runs once: the message listener reads `actions` fresh via closure and
  // doesn't need to be re-subscribed when it changes identity.
  // biome-ignore lint/correctness/useExhaustiveDependencies: actions.addLog is stable in practice and deliberately omitted, see comment above.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data?.__playgroundConsole) return;
      actions.addLog({
        level: data.level,
        message: data.message,
        timestamp: Date.now(),
      });
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-panel px-3">
        <span className="text-[11px] font-medium text-muted-foreground">Preview</span>
        <div className="flex items-center gap-2">
          {lastRunAt && (
            <span className="text-[10px] text-muted-foreground">
              updated {lastRunAt.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            title="Refresh preview"
            onClick={() => {
              actions.clearLogs();
              setSrcDoc(buildPreviewDocument(files.html, files.css, files.js));
              setLastRunAt(new Date());
            }}
          >
            <RotateCw className="size-3" />
          </Button>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        title="Live preview"
        className="w-full flex-1 border-0 bg-white"
        sandbox="allow-scripts allow-modals allow-forms allow-popups"
        srcDoc={srcDoc}
      />
    </div>
  );
}
