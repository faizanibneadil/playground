"use client";

import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

import { usePlaygroundStore } from "@/store/playground-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<string, string> = {
  log: "text-foreground",
  info: "text-[color:var(--css-accent)]",
  warn: "text-[color:var(--js-accent)]",
  error: "text-destructive",
};

const LEVEL_PREFIX: Record<string, string> = {
  log: ">",
  info: "i",
  warn: "!",
  error: "x",
};

export function ConsolePanel() {
  const logs = usePlaygroundStore((s) => s.logs);
  const clearLogs = usePlaygroundStore((s) => s.clearLogs);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div className="flex h-full flex-col bg-editor">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[11px] font-medium text-muted-foreground">
          Console{logs.length > 0 ? ` (${logs.length})` : ""}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          title="Clear console"
          onClick={clearLogs}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-3 py-1.5 font-mono text-[12px] leading-5"
      >
        {logs.length === 0 && (
          <p className="pt-1 text-muted-foreground/70">
            Console output from your JavaScript will show up here.
          </p>
        )}
        {logs.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "flex items-start gap-2 border-b border-border/50 py-1 last:border-0",
              LEVEL_STYLES[entry.level] ?? "text-foreground"
            )}
          >
            <span className="mt-0.5 select-none text-muted-foreground">
              {LEVEL_PREFIX[entry.level] ?? ">"}
            </span>
            <span className="whitespace-pre-wrap break-words">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
