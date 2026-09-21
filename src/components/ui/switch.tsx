"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-8 shrink-0 items-center rounded-full border border-input shadow-xs transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        "data-[checked]:bg-primary data-[checked]:border-primary data-[unchecked]:bg-input",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-3.5 rounded-full bg-background shadow-sm ring-0 transition-transform duration-150",
          "data-[checked]:translate-x-[14px] data-[unchecked]:translate-x-px",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
