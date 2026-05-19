import * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-stone-300 text-amber-700 accent-amber-700 focus:ring-amber-700",
        className,
      )}
      {...props}
    />
  );
}
