"use client";

import { BookOpen, Files, type LucideIcon } from "lucide-react";
import { type SidebarView, usePlayground } from "@/context/playground-context";
import { cn } from "@/lib/utils";

const ITEMS: { view: Exclude<SidebarView, null>; label: string; icon: LucideIcon }[] = [
  { view: "files", label: "Files", icon: Files },
  { view: "theory", label: "Theory", icon: BookOpen },
];

/** VS Code style primary bar. Clicking the active icon collapses the sidebar,
 * clicking another icon switches the sidebar content. It never touches the editor. */
export function ActivityBar() {
  const { state, actions } = usePlayground();

  return (
    <nav
      aria-label="Primary"
      className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-panel"
    >
      {ITEMS.map(({ view, label, icon: Icon }) => {
        const active = state.sidebarView === view;
        return (
          <button
            key={view}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => actions.setSidebarView(active ? null : view)}
            className={cn(
              "relative flex h-12 w-full items-center justify-center text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground",
              active && "text-foreground",
            )}
          >
            {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
            <Icon className="size-5" strokeWidth={1.5} />
          </button>
        );
      })}
    </nav>
  );
}
