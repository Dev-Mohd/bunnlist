import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 shadow-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20",
        className,
      )}
      {...props}
    />
  );
}
