"use client";

import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePlayground } from "@/context/playground-context";
import { buildPreviewDocument } from "@/lib/preview-document";

const AUTO_RUN_DEBOUNCE_MS = 500;

export function PreviewPanel() {
  const { state, actions } = usePlayground();
  const { files, runVersion } = state;
  const [autoRun, setAutoRun] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [srcDoc, setSrcDoc] = useState("");

  // Keep the latest files available to the runVersion-triggered effect
  // below without adding `files` to its dependency array.
  const filesRef = useRef(files);
  filesRef.current = files;

  function refreshPreview() {
    actions.clearLogs();
    setSrcDoc(
      buildPreviewDocument(filesRef.current.html, filesRef.current.css, filesRef.current.js),
    );
  }

  // Rebuilds the iframe whenever runVersion changes — bumped by initial
  // mount/hydration, Reset, and by the auto-run effect below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshPreview reads filesRef/actions freshly and doesn't need to be a dependency.
  useEffect(() => {
    refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runVersion]);

  // Auto-run: debounced so typing doesn't create/update on every
  // keystroke. Skips the very first render — the mount/hydration effect
  // above already handles the initial run. actions.refresh() itself
  // decides whether this is a creation (no record yet) or a pure local
  // preview refresh (record already exists) — same logic either way.
  const isFirstRender = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: actions.refresh is stable; only files/autoRun should retrigger this.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!autoRun) return;
    const timer = setTimeout(() => {
      void actions.refresh();
    }, AUTO_RUN_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.html, files.css, files.js, autoRun]);

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
        <Label htmlFor="auto-run" className="text-[11px] text-muted-foreground">
          Auto-run
          <Checkbox
            id="auto-run"
            checked={autoRun}
            onCheckedChange={(checked) => setAutoRun(checked === true)}
          />
        </Label>
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