"use client";

import { ChevronDown, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { usePlayground } from "@/context/playground-context";
import { ProjectNameField } from "./ProjectNameField";
import { ThemeToggle } from "./ThemeToggle";
import { ViewTabs } from "./ViewTabs";

function RunResetControls({ fullWidth = false }: { fullWidth?: boolean }) {
  const { actions } = usePlayground();
  return (
    <>
      <Button
        size="sm"
        onClick={() => actions.run()}
        className={fullWidth ? "flex-1 gap-1.5" : "gap-1.5"}
      >
        <Play className="size-3 fill-current" />
        Run
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className={fullWidth ? "flex-1 gap-1.5" : "gap-1.5"}
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
        onCheckedChange={(checked:boolean) => actions.setAutoSave(checked === true)}
      />
      Auto-save
      <span className="text-[11px]">
        {state.autoSave
          ? state.saveStatus === "saved"
            ? "(saved)"
            : "(saving…)"
          : "(off)"}
      </span>
    </Label>
  );
}

/** The "Playground" title — on mobile it's also the trigger for the
 * options drawer (project name, auto-save, run, reset); on desktop the
 * project name field just sits next to it inline. */
function TitleBlock({ isMobile }: { isMobile: boolean }) {
  const title = (
    <h1 className="text-sm font-semibold tracking-tight text-foreground">Playground</h1>
  );

  if (!isMobile) {
    return (
      <div className="flex items-center gap-2.5">
        {/* {title} */}
        <ProjectNameField />
      </div>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent">
        {title}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DrawerTrigger>
      <DrawerContent title="Playground options" className="h-auto max-h-[80dvh]">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Project name
            </span>
            <ProjectNameField />
          </div>
          <AutoSaveToggle />
          <div className="flex gap-2">
            <RunResetControls fullWidth />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function Header({ isMobile }: { isMobile: boolean }) {
  return (
    <header className="flex h-12 items-center justify-between gap-2 border-b border-border bg-panel px-2 sm:px-3">
      {/* Left: Theory / Practical tabs on every device. */}
      <div className="flex min-w-0 flex-1 items-center">
        <ViewTabs />
      </div>

      {/* Center: the Playground title. */}
      <div className="flex shrink-0 items-center justify-center">
        <TitleBlock isMobile={isMobile} />
      </div>

      {/* Right: auto-save/run/reset inline on desktop (mobile keeps those
          behind the drawer above), theme toggle always visible. */}
      <div className="flex flex-1 items-center justify-end gap-3">
        {!isMobile && (
          <>
            <AutoSaveToggle />
            <RunResetControls />
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}