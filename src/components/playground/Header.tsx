"use client";

import { Play, RotateCcw } from "lucide-react";

import { usePlaygroundStore } from "@/store/playground-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectNameField } from "./ProjectNameField";

export function Header() {
  const mainView = usePlaygroundStore((s) => s.mainView);
  const setMainView = usePlaygroundStore((s) => s.setMainView);
  const autoSave = usePlaygroundStore((s) => s.autoSave);
  const setAutoSave = usePlaygroundStore((s) => s.setAutoSave);
  const saveStatus = usePlaygroundStore((s) => s.saveStatus);
  const run = usePlaygroundStore((s) => s.run);
  const reset = usePlaygroundStore((s) => s.reset);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-panel px-3">
      {/* Left: brand + editable project name */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-html-accent" />
          <span className="size-2.5 rounded-full bg-css-accent" />
          <span className="size-2.5 rounded-full bg-js-accent" />
        </div>
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          Playground
        </h1>
        <ProjectNameField />
      </div>

      {/* Center: Theory / Practical */}
      <div className="flex shrink-0 items-center justify-center">
        <Tabs value={mainView} onValueChange={(v) => setMainView(v as "theory" | "practical")}>
          <TabsList>
            <TabsTrigger value="theory">Theory</TabsTrigger>
            <TabsTrigger value="practical">Practical</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Right: auto-save, run, reset */}
      <div className="flex flex-1 items-center justify-end gap-3">
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          {autoSave
            ? saveStatus === "saved"
              ? "Saved"
              : "Saving…"
            : "Auto-save off"}
        </span>
        <Label htmlFor="autosave" className="cursor-pointer text-muted-foreground">
          <Checkbox
            id="autosave"
            checked={autoSave}
            onCheckedChange={(checked) => setAutoSave(checked === true)}
          />
          Auto-save
        </Label>
        <Button size="sm" onClick={() => run()} className="gap-1.5">
          <Play className="size-3 fill-current" />
          Run
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={() => {
            if (window.confirm("Reset HTML, CSS and JS back to the starter template?")) {
              reset();
            }
          }}
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
      </div>
    </header>
  );
}
