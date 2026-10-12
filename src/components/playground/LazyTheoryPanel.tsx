"use client";

import dynamic from "next/dynamic";

// Tiptap (the rich-text editor, ProseMirror, StarterKit's node/mark set)
// only matters once someone opens Theory, so it's loaded on demand rather
// than bundled into the initial JS.
export const LazyTheoryPanel = dynamic(
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
