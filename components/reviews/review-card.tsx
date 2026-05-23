import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingDisplay } from "@/components/coffees/rating-display";
import type { ReviewWithUser } from "@/actions/reviews";
import { formatBrewMethod } from "@/lib/coffee-labels";
import { formatReviewDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

type ReviewCardProps = {
  review: ReviewWithUser;
  isCurrentUser?: boolean;
};

export function ReviewCard({ review, isCurrentUser = false }: ReviewCardProps) {
  const userName = review.user.name ?? "مستخدم BunnList";
  const initial = userName.trim().charAt(0) || "م";

  return (
    <Card className={cn("p-5", isCurrentUser && "border-amber-300 bg-amber-50/30")}>
      <div className="flex gap-4">
        {review.user.image ? (
          <Image
            src={review.user.image}
            alt={`صورة ${userName}`}
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-stone-200"
          />
        ) : (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
            {initial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-stone-950">{userName}</h3>
                {isCurrentUser ? <Badge variant="gold">تقييمك</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-stone-500">{formatReviewDate(review.createdAt)}</p>
            </div>
            <RatingDisplay rating={review.rating} count={1} compact hideCount />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="soft">{formatBrewMethod(review.brewMethod)}</Badge>
            {review.wouldBuyAgain ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                يشتريها مرة ثانية
              </span>
            ) : (
              <Badge variant="outline">ما يشتريها</Badge>
            )}
          </div>

          {review.body ? <p className="mt-4 leading-8 text-stone-700">{review.body}</p> : null}
        </div>
      </div>
    </Card>
  );
}
