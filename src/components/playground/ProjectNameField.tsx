"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { usePlayground } from "@/context/playground-context";
import { DEFAULT_PROJECT_NAME, sanitizeProjectNameInput } from "@/lib/slugify";
import { cn } from "@/lib/utils";

export function ProjectNameField() {
  const { state, actions } = usePlayground();
  const projectName = state.projectName;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    actions.setProjectName(draft.trim().length > 0 ? draft : DEFAULT_PROJECT_NAME);
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(sanitizeProjectNameInput(e.target.value))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setDraft(projectName);
            setEditing(false);
          }
        }}
        spellCheck={false}
        placeholder="project-name"
        className="h-6 w-40 font-mono text-xs"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(projectName);
        setEditing(true);
      }}
      title="Click to rename this project"
      className={cn(
        "group flex h-6 items-center gap-1.5 rounded-md border border-transparent px-2 font-mono text-xs text-muted-foreground",
        "hover:border-border hover:bg-secondary/60 hover:text-foreground transition-colors",
      )}
    >
      {projectName}
      <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-70" />
    </button>
  );
}
