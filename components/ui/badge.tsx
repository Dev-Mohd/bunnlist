import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "soft" | "outline" | "gold";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variant === "default" && "bg-stone-900 text-white",
        variant === "soft" && "bg-stone-100 text-stone-700",
        variant === "outline" && "border border-stone-300 bg-white text-stone-700",
        variant === "gold" && "bg-amber-100 text-amber-900",
        className,
      )}
      {...props}
    />
  );
}
