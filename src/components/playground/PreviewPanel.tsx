"use client";

import { Play } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { type ConsoleLogEntry, usePlayground } from "@/context/playground-context";
import { buildPreviewDocument } from "@/lib/preview-document";

const AUTO_RUN_DEBOUNCE_MS = 500;
const LOG_LEVELS: ReadonlySet<string> = new Set(["log", "info", "warn", "error"]);

interface PreviewState {
  srcDoc: string;
  /** Used as the iframe `key` so every run gets a brand-new browsing context. */
  version: number;
}

interface ConsoleBridgeMessage {
  __playgroundConsole?: boolean;
  level?: string;
  message?: unknown;
}

export function PreviewPanel() {
  const { state, actions } = usePlayground();
  const { files, runVersion } = state;
  const [autoRun, setAutoRun] = useState(true);
  const [preview, setPreview] = useState<PreviewState>({ srcDoc: "", version: 0 });
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isFirstRun = useRef(true);

  // Effect Events always read the latest props/state without becoming effect dependencies.
  const rebuildPreview = useEffectEvent(() => {
    actions.clearLogs();
    setPreview({
      srcDoc: buildPreviewDocument(files.html, files.css, files.js),
      version: runVersion,
    });
  });

  const requestRun = useEffectEvent(() => {
    void actions.refresh();
  });

  const handleConsoleMessage = useEffectEvent((event: MessageEvent<ConsoleBridgeMessage>) => {
    if (event.source !== iframeRef.current?.contentWindow) return;
    const data = event.data;
    if (!data?.__playgroundConsole) return;
    if (typeof data.level !== "string" || !LOG_LEVELS.has(data.level)) return;
    actions.addLog({
      level: data.level as ConsoleLogEntry["level"],
      message: typeof data.message === "string" ? data.message : String(data.message),
      timestamp: Date.now(),
    });
  });

  // Rebuild whenever a run is requested (mount, hydration, Reset, Run, auto-run).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runVersion is the trigger; rebuildPreview is an Effect Event.
  useEffect(() => {
    rebuildPreview();
  }, [runVersion]);

  // Debounced auto-run. The first render is skipped: the effect above already does the initial build.
  // biome-ignore lint/correctness/useExhaustiveDependencies: file contents are the triggers; requestRun is an Effect Event.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (!autoRun) return;
    const timer = setTimeout(requestRun, AUTO_RUN_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [files.html, files.css, files.js, autoRun]);

  useEffect(() => {
    const listener = (event: MessageEvent<ConsoleBridgeMessage>) => handleConsoleMessage(event);
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-panel px-3">
        <span className="text-[11px] font-medium text-muted-foreground">Preview</span>
        <div className="flex items-center gap-3">
          <Label htmlFor="auto-run" className="text-[11px] text-muted-foreground">
            Auto-run
            <Checkbox
              id="auto-run"
              checked={autoRun}
              onCheckedChange={(checked) => setAutoRun(checked === true)}
            />
          </Label>
          <button
            type="button"
            onClick={requestRun}
            title="Run preview"
            aria-label="Run preview"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Play className="size-3.5" />
          </button>
        </div>
      </div>
      {/* Absolute fill gives the iframe a definite size everywhere (desktop panels + mobile). */}
      <div className="relative min-h-0 flex-1 bg-white">
        <iframe
          key={preview.version}
          ref={iframeRef}
          title="Live preview"
          className="absolute inset-0 size-full border-0 bg-white"
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          srcDoc={preview.srcDoc}
        />
      </div>
    </div>
  );
}