import Link from "next/link";
import { ReviewCard } from "@/components/reviews/review-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { getReviewsByCoffeeLot } from "@/actions/reviews";

type ReviewsListProps = {
  reviewsPromise: ReturnType<typeof getReviewsByCoffeeLot>;
  currentUserId?: string | null;
  basePath: string;
};

function pageHref(basePath: string, page: number) {
  if (page <= 1) {
    return basePath;
  }

  return `${basePath}?reviewsPage=${page}`;
}

export async function ReviewsList({ reviewsPromise, currentUserId, basePath }: ReviewsListProps) {
  const { reviews, totalPages, currentPage } = await reviewsPromise;

  if (!reviews.length) {
    return (
      <EmptyState
        title="كن أول من يقيّم هذا المحصول"
        description="شارك تجربتك مع طريقة التحضير والنكهات التي ظهرت لك."
      />
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} isCurrentUser={review.userId === currentUserId} />
      ))}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2 pt-3" aria-label="صفحات التقييمات">
          {Array.from({ length: totalPages }).map((_, index) => {
            const page = index + 1;
            return (
              <Link
                key={page}
                href={pageHref(basePath, page)}
                className={
                  page === currentPage
                    ? "grid h-10 w-10 place-items-center rounded-md bg-amber-700 text-sm font-bold text-white"
                    : "grid h-10 w-10 place-items-center rounded-md border border-stone-200 bg-white text-sm font-bold text-stone-700 hover:bg-stone-50"
                }
              >
                {page}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
