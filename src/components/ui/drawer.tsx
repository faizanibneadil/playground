"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/** A bottom sheet built on Base UI's Drawer, used on mobile for the
 * preview and console panels (which live inline as resizable panels on
 * desktop instead — see Playground.tsx). */
function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root swipeDirection="down" {...props} />;
}

function DrawerTrigger(
  props: React.ComponentProps<typeof DrawerPrimitive.Trigger>
) {
  return <DrawerPrimitive.Trigger {...props} />;
}

function DrawerContent({
  className,
  title,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  title: string;
}) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-200",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
        )}
      />
      <DrawerPrimitive.Viewport className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
        <DrawerPrimitive.Popup
          className={cn(
            "flex h-[75dvh] w-full flex-col rounded-t-xl border-t border-border bg-panel shadow-2xl",
            "transition-transform duration-200 ease-out",
            "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
            className
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
          <DrawerPrimitive.Content
            className="flex min-h-0 flex-1 flex-col"
            {...props}
          >
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
              <DrawerPrimitive.Title className="text-xs font-medium text-muted-foreground">
                {title}
              </DrawerPrimitive.Title>
              <DrawerPrimitive.Close className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="size-3.5" />
              </DrawerPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1">{children}</div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

export { Drawer, DrawerTrigger, DrawerContent };
