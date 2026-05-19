import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Pencil, Star } from "lucide-react";
import { requireAuth } from "@/lib/auth-helpers";
import { getMyReviews } from "@/actions/reviews";
import { getCoffeeImageUrl } from "@/lib/storage";
import { SiteHeader } from "@/components/ui/site-header";
import { SiteFooter } from "@/components/ui/site-footer";
import { formatBrewMethod } from "@/lib/coffee-labels";

export const metadata = { title: "تقييماتي | BunnList" };

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} من 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-amber-500 text-amber-500" : "text-stone-200"}`}
        />
      ))}
      <span className="mr-1.5 text-sm font-bold text-stone-700">{rating}/5</span>
    </div>
  );
}

export default async function MyReviewsPage() {
  await requireAuth();
  const reviews = await getMyReviews();

  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-stone-500">
          <Link href="/" className="hover:text-stone-800">الرئيسية</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-stone-800">تقييماتي</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-stone-950">تقييماتي</h1>
          <p className="mt-1 text-sm text-stone-500">
            {reviews.length > 0
              ? `لديك ${reviews.length} تقييم`
              : "لم تضف أي تقييم بعد"}
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white py-20 text-center">
            <span className="mb-4 text-5xl">☕</span>
            <p className="text-lg font-bold text-stone-600">لم تضف أي تقييم بعد</p>
            <p className="mt-2 text-sm text-stone-400">
              جرّب محاصيل القهوة وشارك تجربتك مع الآخرين
            </p>
            <Link
              href="/coffees"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-800"
            >
              استكشف المحاصيل
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const imageUrl = getCoffeeImageUrl(review.coffeeLot.imagePath);
              return (
                <div
                  key={review.id}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
                >
                  <div className="flex gap-4 p-5">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                      {review.coffeeLot.imagePath ? (
                        <Image
                          src={imageUrl}
                          alt={review.coffeeLot.nameAr}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">
                          ☕
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/coffees/${review.coffeeLot.slug}`}
                            className="font-black text-stone-950 hover:text-amber-700"
                          >
                            {review.coffeeLot.nameAr}
                          </Link>
                          <p className="text-sm text-stone-500">
                            {review.coffeeLot.roaster.nameAr}
                          </p>
                        </div>
                        <Link
                          href={`/coffees/${review.coffeeLot.slug}/review`}
                          className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          تعديل
                        </Link>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <StarRow rating={review.rating} />
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
                          {formatBrewMethod(review.brewMethod)}
                        </span>
                        {review.wouldBuyAgain ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            يشتريها مرة ثانية
                          </span>
                        ) : null}
                      </div>

                      {review.body ? (
                        <p className="mt-3 line-clamp-2 text-sm leading-7 text-stone-600">
                          {review.body}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
