import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingDisplayProps = {
  rating: number;
  count?: number;
  compact?: boolean;
  className?: string;
};

export function RatingDisplay({ rating, count, compact = false, className }: RatingDisplayProps) {
  if (!count || rating <= 0) {
    return <span className={cn("text-sm font-medium text-stone-500", className)}>لم يُقيّم بعد</span>;
  }

  return (
    <div className={cn("flex items-center gap-2 text-stone-800", className)}>
      <div className="flex items-center gap-0.5 text-amber-500" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn("h-4 w-4", index < Math.round(rating) ? "fill-current" : "fill-transparent")}
          />
        ))}
      </div>
      <span className={cn("font-bold", compact ? "text-sm" : "text-base")}>{rating.toFixed(1)}</span>
      <span className="text-sm text-stone-500">({count})</span>
    </div>
  );
}
