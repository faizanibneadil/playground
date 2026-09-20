"use client";

import { BookOpen } from "lucide-react";

export function TheoryPanel() {
  return (
    <div className="flex h-full items-center justify-center bg-editor px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary/60">
          <BookOpen className="size-5 text-muted-foreground" />
        </div>
        <h2 className="text-sm font-medium text-foreground">Theory</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Lesson notes and reading material for this exercise will appear
          here. Switch to the &ldquo;Practical&rdquo; tab above to write and
          run HTML, CSS and JavaScript.
        </p>
      </div>
    </div>
  );
}
