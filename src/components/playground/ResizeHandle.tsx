"use client";

import { Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

export function ResizeHandle({
  direction = "horizontal",
}: {
  direction?: "horizontal" | "vertical";
}) {
  return (
    <Separator
      className={cn(
        "group relative shrink-0 bg-border/60 transition-colors",
        direction === "horizontal"
          ? "w-px cursor-col-resize hover:bg-primary/40"
          : "h-px cursor-row-resize hover:bg-primary/40"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute rounded-full bg-transparent",
          direction === "horizontal"
            ? "left-1/2 top-1/2 h-8 w-2.5 -translate-x-1/2 -translate-y-1/2"
            : "left-1/2 top-1/2 h-2.5 w-8 -translate-x-1/2 -translate-y-1/2"
        )}
      />
    </Separator>
  );
}
