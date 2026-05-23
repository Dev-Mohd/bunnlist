import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingDisplayProps = {
  rating: number;
  count?: number;
  compact?: boolean;
  hideCount?: boolean;
  className?: string;
};

function formatReviewCount(count: number) {
  if (count === 1) {
    return "تقييم واحد";
  }

  if (count === 2) {
    return "تقييمان";
  }

  if (count <= 10) {
    return `${count.toLocaleString("ar-SA")} تقييمات`;
  }

  return `${count.toLocaleString("ar-SA")} تقييم`;
}

export function RatingDisplay({ rating, count, compact = false, hideCount = false, className }: RatingDisplayProps) {
  if (!count || rating <= 0) {
    return (
      <span className={cn("text-sm font-medium text-stone-500", className)}>
        {compact ? "بدون تقييمات" : "لم يحصل على تقييمات بعد"}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 text-stone-800", className)}>
      <div className="flex items-center gap-0.5 text-amber-500" aria-label={`متوسط التقييم ${rating.toFixed(1)} من 5`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn("h-4 w-4", index < Math.round(rating) ? "fill-current" : "fill-transparent")}
          />
        ))}
      </div>
      <span className={cn("font-bold", compact ? "text-sm" : "text-base")}>{rating.toFixed(1)}</span>
      {!hideCount ? <span className="text-sm text-stone-500">{formatReviewCount(count)}</span> : null}
    </div>
  );
}
