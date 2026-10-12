"use client";

import { FilePlus, Loader2, RotateCcw, Save, Share2, SquareTerminal } from "lucide-react";
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

function SaveButton() {
  const { state, actions } = usePlayground();
  const isSaving = state.pendingAction === "save";
  const disabled = !state.playgroundId || isSaving;

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => void actions.save()}
      disabled={disabled}
      title={
        state.playgroundId ? "Save this playground" : "Click Run in the preview first"
      }
      aria-label="Save this playground"
    >
      {isSaving ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Save className="size-3.5" />
      )}
    </Button>
  );
}

function ShareButton() {
  const { state, actions } = usePlayground();
  const isSharing = state.pendingAction === "share";

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => void actions.share()}
      disabled={isSharing}
      title="Share this playground"
      aria-label="Share this playground"
    >
      {isSharing ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Share2 className="size-3.5" />
      )}
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
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        title="Reset playground"
        aria-label="Reset playground"
      >
        <RotateCcw className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset this playground?</AlertDialogTitle>
          <AlertDialogDescription>
            Your files, folders and theory notes will be replaced with the starter
            template
            {state.playgroundId
              ? " and the shared link for this playground will stop working"
              : ""}
            . This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.actionError && (
          <p className="text-xs text-destructive">{state.actionError}</p>
        )}
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

/** Shown only in read-only sessions — sends the viewer to a completely
 * fresh playground of their own. Uses a hard navigation so every bit of
 * local state resets, and the current origin so this works in dev too
 * (not just on the production domain). */
function NewPlaygroundButton() {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="gap-1.5"
      onClick={() => {
        window.location.href = `${window.location.origin}${window.location.pathname}`;
      }}
    >
      <FilePlus className="size-3.5" />
      New Playground
    </Button>
  );
}

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
  const { state, isReadOnly } = usePlayground();
  useActionErrorAlert();

  return (
    <header className="grid h-9 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-border bg-panel px-2 md:grid-cols-[1fr_minmax(0,28rem)_1fr] sm:px-3">
      {/* Left: app name, like the window icon + menu area of VS Code's title bar. */}
      <div className="flex min-w-0 items-center gap-2">
        <SquareTerminal className="size-4 shrink-0 text-primary" />
        <h1 className="hidden truncate text-xs font-medium text-foreground md:block">
          Playground
        </h1>
      </div>

      {/* Center: where VS Code puts its search box. Here it holds the project
          name (the slug saved with the playground). */}
      <div className="flex min-w-0 justify-center">
        <ProjectNameField />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-0.5">
        {isReadOnly && <NewPlaygroundButton />}
        {!isReadOnly && <SaveButton />}
        {state.canShare && <ShareButton />}
        {!isReadOnly && <ResetButton />}
        <ThemeToggle />
      </div>
    </header>
  );
}
