"use client";

import { ChevronDown, Play, RotateCcw } from "lucide-react";

import { usePlayground } from "@/context/playground-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsIndicator } from "@/components/ui/tabs";
import { ProjectNameField } from "./ProjectNameField";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isMobile: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}

function ViewTabs() {
  const { state, actions } = usePlayground();
  return (
    <Tabs
      value={state.mainView}
      onValueChange={(v) => actions.setMainView(v as "theory" | "practical")}
    >
      <TabsList>
        <TabsIndicator />
        <TabsTrigger value="theory">Theory</TabsTrigger>
        <TabsTrigger value="practical">Practical</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function RunResetControls() {
  const { actions } = usePlayground();
  return (
    <>
      <Button size="sm" onClick={() => actions.run()} className="gap-1.5">
        <Play className="size-3 fill-current" />
        Run
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="gap-1.5"
        onClick={() => {
          if (window.confirm("Reset HTML, CSS and JS back to the starter template?")) {
            actions.reset();
          }
        }}
      >
        <RotateCcw className="size-3" />
        Reset
      </Button>
    </>
  );
}

function AutoSaveToggle() {
  const { state, actions } = usePlayground();
  return (
    <Label htmlFor="autosave" className="cursor-pointer text-muted-foreground">
      <Checkbox
        id="autosave"
        checked={state.autoSave}
        onCheckedChange={(checked) => actions.setAutoSave(checked === true)}
      />
      Auto-save
      <span className="hidden text-[11px] sm:inline">
        {state.autoSave
          ? state.saveStatus === "saved"
            ? "(saved)"
            : "(saving…)"
          : "(off)"}
      </span>
    </Label>
  );
}

export function Header({ isMobile, expanded, onToggleExpand }: HeaderProps) {
  if (isMobile) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-panel">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex h-11 shrink-0 items-center justify-between px-3"
        >
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Playground
            </h1>
          </div>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>

        {expanded && (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto border-t border-border px-3 py-3">
            <ProjectNameField />
            <ViewTabs />
            <div className="flex flex-wrap items-center gap-2">
              <AutoSaveToggle />
              <RunResetControls />
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <header className="flex h-12 items-center justify-between gap-3 border-b border-border bg-panel px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          Playground
        </h1>
        <ProjectNameField />
      </div>

      <div className="flex shrink-0 items-center justify-center">
        <ViewTabs />
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <AutoSaveToggle />
        <RunResetControls />
        <ThemeToggle />
      </div>
    </header>
  );
}
