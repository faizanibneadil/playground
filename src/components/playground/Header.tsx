"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { usePlayground } from "@/context/playground-context";
import { ProjectNameField } from "./ProjectNameField";
import { ThemeToggle } from "./ThemeToggle";
import { ViewTabs } from "./ViewTabs";

/** Replaces the old separate "Run" button + auto-run checkbox with a
 * single play/pause toggle. Playing = the preview keeps re-running as
 * you type (the previous default behaviour); pausing stops that until
 * you resume, at which point it also runs once immediately. */
function AutoRunToggle() {
  const { state, actions } = usePlayground();
  const isPlaying = state.autoRun;

  return (
    <Button
      size="icon"
      className="text-white"
      onClick={() => {
        const next = !isPlaying;
        actions.setAutoRun(next);
        if (next) actions.run();
      }}
      title={isPlaying ? "Pause auto-run" : "Resume auto-run"}
      aria-label={isPlaying ? "Pause auto-run" : "Resume auto-run"}
    >
      {isPlaying ? (
        <Pause className="size-3.5 fill-current" />
      ) : (
        <Play className="size-3.5 fill-current " />
      )}
    </Button>
  );
}

function ResetButton() {
  const { actions } = usePlayground();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        className={buttonVariants({ variant: "secondary", size: "icon" })}
        title="Reset playground"
        aria-label="Reset playground"
      >
        <RotateCcw className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset this playground?</AlertDialogTitle>
          <AlertDialogDescription>
            Your HTML, CSS and JS will be replaced with the starter template. This
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => actions.reset()}>Reset</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Same 3-section header on every device now: Theory/Practical tabs on
 * the left, the editable project name in the center, and play/pause +
 * reset + theme toggle on the right. No more mobile options drawer. */
export function Header() {
  return (
    <header className="flex h-12 items-center justify-between gap-2 border-b border-border bg-panel px-2 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center">
        <ViewTabs />
      </div>

      <div className="flex shrink-0 items-center justify-center">
        <ProjectNameField />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <AutoRunToggle />
        <ResetButton />
        <ThemeToggle />
      </div>
    </header>
  );
}