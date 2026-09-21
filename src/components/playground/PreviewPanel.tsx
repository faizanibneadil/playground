"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";

import { usePlayground } from "@/context/playground-context";
import { buildPreviewDocument } from "@/lib/preview-document";
import { Button } from "@/components/ui/button";

const REFRESH_DEBOUNCE_MS = 400;

export function PreviewPanel() {
  const { state, actions } = usePlayground();
  const { files, runVersion } = state;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [srcDoc, setSrcDoc] = useState("");
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      actions.clearLogs();
      setSrcDoc(buildPreviewDocument(files.html, files.css, files.js));
      setLastRunAt(new Date());
    }, runVersion === 0 ? 0 : REFRESH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // Re-run whenever the files change, or "Run" is pressed (runVersion bump).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.html, files.css, files.js, runVersion]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || !data.__playgroundConsole) return;
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
