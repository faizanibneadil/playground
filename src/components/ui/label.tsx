import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-1.5 text-xs leading-none font-medium select-none",
        "peer-data-[disabled]:cursor-not-allowed peer-data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
