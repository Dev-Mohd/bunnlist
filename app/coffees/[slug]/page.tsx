import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, Coffee, MapPin, Pencil, Plus, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { getCoffeeLotBySlug } from "@/actions/coffees";
import { getReviewsByCoffeeLot, getUserReviewForCoffeeLot } from "@/actions/reviews";
import { CoffeeImage } from "@/components/coffees/coffee-image";
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

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-stone-950">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-7 text-stone-600">{description}</p> : null}
    </div>
  );
}

function ChipList({ items, variant = "stone" }: { items: string[]; variant?: "stone" | "amber" }) {
  const visibleItems = items.filter(Boolean);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => (
        <span
          key={item}
          className={
            variant === "amber"
              ? "rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900"
              : "rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700"
          }
        >
          <span className="break-words">{item}</span>
        </span>
      ))}
    </div>
  );
}

function BestBrew({ coffee }: { coffee: Awaited<ReturnType<typeof getCoffeeLotBySlug>> }) {
  if (!coffee) return null;

  const bestStat = coffee.brewStats[0];

  if (bestStat) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="h-4 w-4" />
          أفضل طريقة حسب التجارب
        </div>
        <p className="mt-2 text-2xl font-black">{formatBrewMethod(bestStat.brewMethod)}</p>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          متوسط {bestStat.averageRating.toFixed(1)} من {bestStat.reviewCount} تجربة منشورة
        </p>
      </div>
    );
  }

  if (coffee.recommendedBrewMethods.length) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <p className="text-sm font-bold text-stone-950">طرق التحضير المقترحة</p>
        <div className="mt-3">
          <ChipList items={coffee.recommendedBrewMethods.map(formatBrewMethod)} variant="amber" />
        </div>
      </div>
    );
  }

  return null;
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

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const coffee = await getCoffeeLotBySlug(slug);

  if (!coffee) {
    return { title: "محصول غير موجود | BunnList" };
  }

  return {
    title: `${coffee.name} | BunnList`,
    description: `تقييمات وتجارب تحضير ${coffee.name} من ${coffee.roaster.name}.`,
  };
}

export default async function CoffeeDetailsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const reviewPage = Number(resolvedSearchParams?.reviewsPage ?? "1") || 1;
  const coffee = await getCoffeeLotBySlug(slug);

  if (!coffee) {
    notFound();
  }

  const session = await auth();
  const userReview = await getUserReviewForCoffeeLot(coffee.id);
  const reviewsPromise = getReviewsByCoffeeLot(coffee.id, reviewPage);
  const roasterCoffeesHref = `/coffees?roasterIds=${encodeURIComponent(coffee.roaster.id)}`;
  const varietyName = formatVariety(coffee.variety);
  const reviewHref = `/coffees/${coffee.slug}/review`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(reviewHref)}`;

  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Link
            href="/coffees"
            className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 transition hover:text-amber-900"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع إلى المحاصيل
          </Link>
        </div>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:pb-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <CoffeeImage
              src={getCoffeeImageUrl(coffee.imagePath)}
              alt={`صورة ${coffee.name}`}
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="p-10 shadow-sm sm:p-12"
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              <Badge variant="gold">{formatProcess(coffee.process, coffee.processLabel)}</Badge>
              <Badge variant="outline">{coffee.originCountry.nameAr}</Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight text-stone-950 sm:text-5xl">{coffee.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-semibold text-stone-600">
              <Link
                href={roasterCoffeesHref}
                className="inline-flex items-center gap-2 transition hover:text-amber-900"
              >
                <Coffee className="h-4 w-4 text-amber-800" />
                {coffee.roaster.name}
              </Link>
              {coffee.region ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-800" />
                  {coffee.region}
                </span>
              ) : null}
            </div>
            <div className="mt-6">
              <RatingDisplay rating={coffee.averageRating} count={coffee.reviewCount} />
            </div>
            <div className="mt-6">
              <BestBrew coffee={coffee} />
            </div>
            {coffee.flavorNotes.length ? (
              <div className="mt-6">
                <p className="mb-3 text-sm font-bold text-stone-700">نكهات بارزة</p>
                <ChipList items={coffee.flavorNotes.slice(0, 8)} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-8">
          <section>
            <SectionTitle title="معلومات المحصول" description="تفاصيل تساعدك تفهم شخصية المحصول قبل الشراء أو التحضير." />
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <DetailRow label="المعالجة" value={formatProcess(coffee.process, coffee.processLabel)} />
              <DetailRow label="السلالة" value={varietyName} />
              <DetailRow label="درجة التحميص" value={coffee.roastLevel} />
              <DetailRow label="الدولة" value={coffee.originCountry.nameAr} />
              <DetailRow label="المنطقة" value={coffee.region} />
              <DetailRow label="المزرعة" value={coffee.farm} />
              <DetailRow label="المنتج" value={coffee.producer} />
              <DetailRow label="الارتفاع" value={coffee.altitudeMeters ? `${coffee.altitudeMeters} متر` : null} />
            </dl>
          </section>

          {coffee.recommendedBrewMethods.length ? (
            <section>
              <SectionTitle
                title="طرق التحضير المناسبة"
                description="ابدأ بهذه الطرق إذا كنت تبحث عن استخلاص أقرب لطبيعة المحصول."
              />
              <Card className="mt-5 p-5">
                <ChipList items={coffee.recommendedBrewMethods.map(formatBrewMethod)} variant="amber" />
              </Card>
            </section>
          ) : null}

          {coffee.flavorNotes.length ? (
            <section>
              <SectionTitle title="النكهات" description="ملاحظات مختصرة من بيانات المحصول لتسهيل المقارنة السريعة." />
              <Card className="mt-5 p-5">
                <ChipList items={coffee.flavorNotes.slice(0, 12)} />
              </Card>
            </section>
          ) : null}

          {coffee.descriptionAr || coffee.description ? (
            <section>
              <SectionTitle title="الوصف" />
              <p className="mt-4 rounded-lg border border-stone-200 bg-white p-5 leading-8 text-stone-700">
                {coffee.descriptionAr ?? coffee.description}
              </p>
            </section>
          ) : null}

          <section>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <SectionTitle
                  title="تقييمات المستخدمين"
                  description="تجارب فعلية تساعدك تعرف أداء المحصول مع طرق تحضير مختلفة."
                />
                {coffee.reviewCount ? (
                  <span className="mt-2 block text-sm font-semibold text-stone-500">
                    {coffee.reviewCount.toLocaleString("ar-SA")} تقييم
                  </span>
                ) : null}
              </div>
              <Link
                href={session?.user ? reviewHref : loginHref}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-amber-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
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
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-bold text-stone-500">المحمصة</p>
                <Link
                  href={roasterCoffeesHref}
                  className="mt-1 inline-flex font-bold text-stone-900 transition hover:text-amber-900"
                >
                  {coffee.roaster.name}
                </Link>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-500">المنشأ</p>
                <p className="mt-1 font-bold text-stone-900">
                  {coffee.originCountry.nameAr}
                  {coffee.region ? `، ${coffee.region}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-500">المعالجة</p>
                <p className="mt-1 font-bold text-stone-900">{formatProcess(coffee.process, coffee.processLabel)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-500">التقييم</p>
                <div className="mt-1">
                  <RatingDisplay rating={coffee.averageRating} count={coffee.reviewCount} compact />
                </div>
              </div>
              {coffee.recommendedBrewMethods.length ? (
                <div>
                  <p className="text-xs font-bold text-stone-500">يناسب</p>
                  <div className="mt-2">
                    <ChipList items={coffee.recommendedBrewMethods.slice(0, 3).map(formatBrewMethod)} variant="amber" />
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
