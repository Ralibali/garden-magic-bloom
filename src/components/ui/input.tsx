import * as React from "react";

import { cn } from "@/lib/utils";
import { fieldShell } from "@/components/ui/field-shell";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full px-3.5 py-2 text-base outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        fieldShell,
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
