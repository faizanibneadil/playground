import * as React from "react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  ref,
  ...props
}: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "flex h-7 w-full min-w-0 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs transition-colors outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
