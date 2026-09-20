"use client";

import { PanelResizeHandle } from "react-resizable-panels";

import { cn } from "@/lib/utils";

export function ResizeHandle({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) {
  return (
    <PanelResizeHandle
      className={cn(
        "group relative shrink-0 bg-border/60 transition-colors data-[resize-handle-active]:bg-primary/60",
        direction === "horizontal" ? "w-px hover:bg-primary/40" : "h-px hover:bg-primary/40"
      )}
    >
      <span
        className={cn(
          "absolute rounded-full bg-transparent",
          direction === "horizontal"
            ? "left-1/2 top-1/2 h-8 w-2.5 -translate-x-1/2 -translate-y-1/2"
            : "left-1/2 top-1/2 h-2.5 w-8 -translate-x-1/2 -translate-y-1/2"
        )}
      />
    </PanelResizeHandle>
  );
}
