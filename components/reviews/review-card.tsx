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
        {/* الصورة الرمزية */}
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
          {/* السطر الأول: الاسم + التقييم */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-stone-950">{userName}</h3>
                {isCurrentUser && <Badge variant="gold">تقييمك</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-stone-400">{formatReviewDate(review.createdAt)}</p>
            </div>
            <RatingDisplay rating={review.rating} compact />
          </div>

          {/* السطر الثاني: طريقة التحضير + قرار الشراء */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="soft">{formatBrewMethod(review.brewMethod)}</Badge>
            {review.wouldBuyAgain ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                ✓ يشتريها مرة ثانية
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">
                ما يشتريها مجدداً
              </span>
            )}
          </div>

          {/* نص التجربة */}
          {review.body ? (
            <p className="mt-3 leading-7 text-stone-700">{review.body}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
