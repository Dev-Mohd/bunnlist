import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-55",
        variant === "primary" && "bg-amber-700 text-white shadow-sm hover:bg-amber-800",
        variant === "secondary" && "bg-stone-200 text-stone-900 hover:bg-stone-300",
        variant === "ghost" && "text-stone-700 hover:bg-stone-100",
        variant === "outline" && "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        className,
      )}
      {...props}
    />
  );
}
