"use client";

import { Loader2, RotateCcw, Save, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

function SaveButton() {
  const { state, actions } = usePlayground();
  const isSaving = state.pendingAction === "save";
  const disabled = !state.playgroundId || isSaving;

  return (
    <Button
      size="icon"
      variant="secondary"
      onClick={() => void actions.save()}
      disabled={disabled}
      title={state.playgroundId ? "Save this playground" : "Click Run in the preview first"}
      aria-label="Save this playground"
    >
      {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
    </Button>
  );
}

function ShareButton() {
  const { state, actions } = usePlayground();
  const isSharing = state.pendingAction === "share";

  return (
    <Button
      size="icon"
      variant="secondary"
      onClick={() => void actions.share()}
      disabled={isSharing}
      title="Share this playground"
      aria-label="Share this playground"
    >
      {isSharing ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" />}
    </Button>
  );
}

function ResetButton() {
  const { state, actions } = usePlayground();
  const [open, setOpen] = useState(false);
  const isResetting = state.pendingAction === "reset";

  async function handleReset() {
    const ok = await actions.reset();
    if (ok) setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
            Your HTML, CSS and JS will be replaced with the starter template
            {state.playgroundId ? " and the shared link for this playground will stop working" : ""}
            . This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.actionError && <p className="text-xs text-destructive">{state.actionError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleReset();
            }}
            disabled={isResetting}
          >
            {isResetting ? "Resetting…" : "Reset"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Save/Share/Reset errors get a plain alert — no new UI chrome added to
 * the header for this. */
function useActionErrorAlert() {
  const { state } = usePlayground();
  const lastShown = useRef<string | null>(null);
  useEffect(() => {
    if (state.actionError && state.actionError !== lastShown.current) {
      lastShown.current = state.actionError;
      window.alert(state.actionError);
    }
  }, [state.actionError]);
}

export function Header() {
  const { state } = usePlayground();
  useActionErrorAlert();

  return (
    <header className="flex h-12 items-center justify-between gap-2 border-b border-border bg-panel px-2 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center">
        <ViewTabs />
      </div>

      <div className="flex shrink-0 items-center justify-center">
        <ProjectNameField />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <SaveButton />
        {state.canShare && <ShareButton />}
        <ResetButton />
        <ThemeToggle />
      </div>
    </header>
  );
}