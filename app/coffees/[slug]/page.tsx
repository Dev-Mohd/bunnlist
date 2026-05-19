import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Coffee, MapPin, Pencil, Plus } from "lucide-react";
import { auth } from "@/auth";
import { getCoffeeLotBySlug } from "@/actions/coffees";
import { getReviewsByCoffeeLot, getUserReviewForCoffeeLot } from "@/actions/reviews";
import { CoffeeImage } from "@/components/coffees/coffee-image";
import { FlavorChips } from "@/components/coffees/flavor-chips";
import { RatingDisplay } from "@/components/coffees/rating-display";
import { ReviewsList } from "@/components/reviews/reviews-list";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";
import { formatBrewMethod, formatProcess, formatVariety } from "@/lib/coffee-labels";
import { getCoffeeImageUrl } from "@/lib/storage";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ reviewsPage?: string }>;
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <dt className="text-xs font-bold text-stone-500">{label}</dt>
      <dd className="mt-1 text-base font-bold text-stone-900">{value}</dd>
    </div>
  );
}

function BestBrew({ coffee }: { coffee: Awaited<ReturnType<typeof getCoffeeLotBySlug>> }) {
  if (!coffee) return null;

  const bestStat = coffee.brewStats[0];

  if (bestStat) {
    return (
      <div className="rounded-lg bg-amber-50 p-4 text-amber-950">
        <p className="text-sm font-bold">أفضل طريقة تحضير حسب التجارب</p>
        <p className="mt-1 text-2xl font-black">{formatBrewMethod(bestStat.brewMethod)}</p>
        <p className="mt-1 text-sm text-amber-900">
          متوسط {bestStat.averageRating.toFixed(1)} من {bestStat.reviewCount} تجربة
        </p>
      </div>
    );
  }

  if (coffee.recommendedBrewMethods.length) {
    return (
      <div className="rounded-lg bg-stone-100 p-4 text-stone-800">
        <p className="text-sm font-bold">طرق التحضير المقترحة</p>
        <p className="mt-1 text-lg font-black">
          {coffee.recommendedBrewMethods.map(formatBrewMethod).join("، ")}
        </p>
      </div>
    );
  }

  return null;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const coffee = await getCoffeeLotBySlug(slug);

  if (!coffee) {
    return { title: "محصول غير موجود | BunnList" };
  }

  return {
    title: `${coffee.nameAr} | BunnList`,
    description: `تقييمات وتجارب تحضير ${coffee.nameAr} من ${coffee.roaster.nameAr}.`,
  };
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-lg bg-stone-200" />
      ))}
    </div>
  );
}

export default async function CoffeeDetailsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const reviewPage = Number((await searchParams)?.reviewsPage ?? "1") || 1;
  const coffee = await getCoffeeLotBySlug(slug);

  if (!coffee) {
    notFound();
  }

  const session = await auth();
  const userReview = await getUserReviewForCoffeeLot(coffee.id);
  const reviewsPromise = getReviewsByCoffeeLot(coffee.id, reviewPage);
  const regionName = coffee.regionAr;
  const varietyName = formatVariety(coffee.variety);
  const reviewHref = `/coffees/${coffee.slug}/review`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(reviewHref)}`;

  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-100 shadow-sm">
            <CoffeeImage
              src={getCoffeeImageUrl(coffee.imagePath)}
              alt={`صورة ${coffee.nameAr}`}
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              <Badge variant="gold">{formatProcess(coffee.process, coffee.processLabel)}</Badge>
              <Badge variant="outline">{coffee.originCountry.nameAr}</Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight text-stone-950 sm:text-5xl">{coffee.nameAr}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-semibold text-stone-600">
              <span className="inline-flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-800" />
                <span>{coffee.roaster.nameAr}</span>
              </span>
              {regionName ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-800" />
                  {regionName}
                </span>
              ) : null}
            </div>
            <div className="mt-6">
              <RatingDisplay rating={coffee.averageRating} count={coffee.reviewCount} />
            </div>
            <div className="mt-6">
              <BestBrew coffee={coffee} />
            </div>
            <div className="mt-6">
              <FlavorChips notes={coffee.flavorNotes} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-black text-stone-950">معلومات المحصول</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <DetailRow label="الدولة" value={coffee.originCountry.nameAr} />
              <DetailRow label="المنطقة" value={regionName} />
              <DetailRow label="المعالجة" value={formatProcess(coffee.process, coffee.processLabel)} />
              <DetailRow label="السلالة" value={varietyName} />
              <DetailRow label="الارتفاع" value={coffee.altitudeMeters ? `${coffee.altitudeMeters} متر` : null} />
              <DetailRow
                label="طرق التحضير المقترحة"
                value={coffee.recommendedBrewMethods.map(formatBrewMethod).join("، ")}
              />
            </dl>
          </section>

          {coffee.descriptionAr ? (
            <section>
              <h2 className="text-2xl font-black text-stone-950">الوصف</h2>
              <p className="mt-4 rounded-lg border border-stone-200 bg-white p-5 leading-8 text-stone-700">
                {coffee.descriptionAr}
              </p>
            </section>
          ) : null}

          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-stone-950">تقييمات المستخدمين</h2>
                {coffee.reviewCount ? <span className="mt-1 block text-sm font-semibold text-stone-500">{coffee.reviewCount} تقييم</span> : null}
              </div>
              <Link
                href={session?.user ? reviewHref : loginHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
              >
                {userReview ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {userReview ? "عدّل تقييمك" : "أضف تقييمك"}
              </Link>
            </div>
            <Suspense fallback={<ReviewsSkeleton />}>
              <ReviewsList
                reviewsPromise={reviewsPromise}
                currentUserId={session?.user?.id}
                basePath={`/coffees/${coffee.slug}`}
              />
            </Suspense>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="text-lg font-black text-stone-950">ملخص سريع</h2>
            <div className="mt-4 space-y-3 text-sm text-stone-700">
              <p>المحمصة: {coffee.roaster.nameAr}</p>
              <p>المنشأ: {coffee.originCountry.nameAr}</p>
              <p>المعالجة: {formatProcess(coffee.process, coffee.processLabel)}</p>
              <p>عدد التقييمات: {coffee.reviewCount}</p>
            </div>
          </Card>
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
