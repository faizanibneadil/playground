"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";

import { usePlaygroundStore } from "@/store/playground-store";
import { buildPreviewDocument } from "@/lib/preview-document";
import { Button } from "@/components/ui/button";

const REFRESH_DEBOUNCE_MS = 400;

export function PreviewPanel() {
  const files = usePlaygroundStore((s) => s.files);
  const runVersion = usePlaygroundStore((s) => s.runVersion);
  const addLog = usePlaygroundStore((s) => s.addLog);
  const clearLogs = usePlaygroundStore((s) => s.clearLogs);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [srcDoc, setSrcDoc] = useState("");
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      clearLogs();
      setSrcDoc(buildPreviewDocument(files.html, files.css, files.js));
      setLastRunAt(new Date());
    }, runVersion === 0 ? 0 : REFRESH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // Re-run whenever the files change, or "Run" is pressed (runVersion bump).
  }, [files.html, files.css, files.js, runVersion, clearLogs]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || !data.__playgroundConsole) return;
      addLog({
        level: data.level,
        message: data.message,
        timestamp: Date.now(),
      });
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [addLog]);

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
              clearLogs();
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
