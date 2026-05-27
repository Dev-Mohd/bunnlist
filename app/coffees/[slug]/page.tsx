import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { Coffee, MapPin, Pencil, Plus } from "lucide-react";
import { auth } from "@/auth";
import { getCoffeeLotBySlug as _getCoffeeLotBySlug, type CoffeeLotDetails } from "@/actions/coffees";
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
import { cn } from "@/lib/utils";

// يُجمِّع الاستدعاءين (generateMetadata + الصفحة) في طلب واحد إلى قاعدة البيانات
const getCoffeeLotBySlug = cache(_getCoffeeLotBySlug);

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ reviewsPage?: string }>;
};

// ── مساعدات محلية ──────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
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
  if (!visibleItems.length) return null;
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

const RAW_IMPORT_DESCRIPTION_FALLBACK = "لا يوجد وصف مختصر لهذا المحصول بعد.";
const RAW_IMPORT_DESCRIPTION_MARKERS = [
  "رابط المنتج",
  "مصدر الدفعة",
  "ثقة الاستخراج",
  "bunnlist_batch",
  ".json",
  "unknown",
  "http://",
  "https://",
  "الاستيراد",
];

function getPublicDescription(description: string | null) {
  if (!description) return null;
  const normalized = description.toLowerCase();
  if (RAW_IMPORT_DESCRIPTION_MARKERS.some((marker) => normalized.includes(marker.toLowerCase()))) {
    return RAW_IMPORT_DESCRIPTION_FALLBACK;
  }
  return description;
}

/** Label سياقي حسب حجم البيانات — لا عبارات مطلقة عند شُح التقييمات */
function brewLabel(reviewCount: number): string {
  if (reviewCount >= 5) return "الأفضل حسب التجارب";
  if (reviewCount >= 2) return "مقترح حسب التجارب الأولية";
  return "مقترح حسب تجربة واحدة";
}

function BestBrew({ coffee }: { coffee: CoffeeLotDetails | null }) {
  if (!coffee) return null;

  const bestStat = coffee.brewStats[0];

  if (bestStat) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
          {brewLabel(coffee.reviewCount)}
        </p>
        <p className="mt-1 text-2xl font-black">{formatBrewMethod(bestStat.brewMethod)}</p>
        <p className="mt-1 text-sm text-amber-800">
          {bestStat.averageRating.toFixed(1)} ★ من {bestStat.reviewCount}{" "}
          {bestStat.reviewCount === 1 ? "تجربة" : "تجارب"}
        </p>
      </div>
    );
  }

  if (coffee.recommendedBrewMethods.length) {
    return (
      <div className="rounded-xl bg-stone-100 p-4 text-stone-800">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">مقترح لـ</p>
        <p className="mt-1 text-lg font-black">
          {coffee.recommendedBrewMethods.map(formatBrewMethod).join("، ")}
        </p>
      </div>
    );
  }

  return null;
}

/** نسبة "يشترونه مجدداً" — لا تظهر إذا كانت البيانات أقل من 3 تقييمات */
function WouldBuyAgainBadge({
  brewStats,
  reviewCount,
}: {
  brewStats: CoffeeLotDetails["brewStats"];
  reviewCount: number;
}) {
  if (reviewCount < 3) return null;

  const totalWouldBuy = brewStats.reduce((sum, s) => sum + s.wouldBuyAgain, 0);
  const rate = Math.round((totalWouldBuy / reviewCount) * 100);

  const styles =
    rate >= 70
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : rate >= 40
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-stone-100 text-stone-600 border-stone-200";

  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
        styles,
      )}
    >
      {rate}٪ يشترونه مجدداً
    </div>
  );
}

/** Card "الخلاصة السريعة" للـ sidebar */
function QuickSummaryCard({ coffee }: { coffee: CoffeeLotDetails }) {
  const { brewStats, reviewCount, averageRating, flavorNotes, recommendedBrewMethods } = coffee;
  const bestStat = brewStats[0];
  const totalWouldBuy = brewStats.reduce((sum, s) => sum + s.wouldBuyAgain, 0);
  const wbRate = reviewCount > 0 ? Math.round((totalWouldBuy / reviewCount) * 100) : null;

  return (
    <Card className="p-5">
      <h2 className="text-lg font-black text-stone-950">الخلاصة السريعة</h2>
      <div className="mt-4 divide-y divide-stone-100 text-sm">

        {/* أفضل طريقة تحضير */}
        {bestStat ? (
          <div className="pb-3">
            <p className="text-xs font-semibold text-stone-500">مناسب أكثر لـ</p>
            <p className="mt-1 font-bold text-stone-900">{formatBrewMethod(bestStat.brewMethod)}</p>
            <p className="mt-0.5 text-xs text-stone-400">{brewLabel(reviewCount)}</p>
          </div>
        ) : recommendedBrewMethods.length > 0 ? (
          <div className="pb-3">
            <p className="text-xs font-semibold text-stone-500">مقترح لـ</p>
            <p className="mt-1 font-bold text-stone-900">
              {recommendedBrewMethods.map(formatBrewMethod).join("، ")}
            </p>
          </div>
        ) : null}

        {/* التقييم */}
        <div className="py-3">
          <p className="text-xs font-semibold text-stone-500">التقييم</p>
          {reviewCount > 0 ? (
            <p className="mt-1 font-bold text-stone-900">
              {averageRating.toFixed(1)} ★{" "}
              <span className="font-normal text-stone-500">من {reviewCount} تقييم</span>
            </p>
          ) : (
            <p className="mt-1 text-stone-400">لم يُقيّم بعد</p>
          )}
        </div>

        {/* أبرز النكهات */}
        {flavorNotes.length > 0 && (
          <div className="py-3">
            <p className="mb-2 text-xs font-semibold text-stone-500">أبرز النكهات</p>
            <FlavorChips notes={flavorNotes} limit={3} />
          </div>
        )}

        {/* هل يشتريه الناس مرة ثانية */}
        {wbRate !== null && reviewCount >= 3 && (
          <div className="pt-3">
            <p className="text-xs font-semibold text-stone-500">هل يشتريه الناس مرة ثانية</p>
            <p
              className={cn(
                "mt-1 font-bold",
                wbRate >= 70
                  ? "text-emerald-700"
                  : wbRate >= 40
                    ? "text-amber-700"
                    : "text-stone-600",
              )}
            >
              {wbRate}٪ يقولون نعم
            </p>
          </div>
        )}
      </div>
    </Card>
  );
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

// ── Metadata ────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const coffee = await getCoffeeLotBySlug(slug);

  if (!coffee) {
    return { title: "محصول غير موجود | BunnList" };
  }

  const description = `تقييمات وتجارب تحضير ${coffee.nameAr} من ${coffee.roaster.nameAr}${coffee.originCountry?.nameAr ? ` · ${coffee.originCountry.nameAr}` : ""}.`;

  const ogImages =
    coffee.storedImageUrl || (coffee.imageUrl && coffee.imagePermissionStatus === "APPROVED")
      ? [{ url: coffee.storedImageUrl ?? coffee.imageUrl!, alt: coffee.nameAr }]
      : undefined;

  return {
    title: `${coffee.nameAr} | BunnList`,
    description,
    openGraph: {
      title: `${coffee.nameAr} — ${coffee.roaster.nameAr} | BunnList`,
      description,
      type: "article",
      ...(ogImages ? { images: ogImages } : {}),
    },
  };
}

// ── Page ─────────────────────────────────────────────────────────

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

  const regionName = coffee.regionAr;
  const varietyName = formatVariety(coffee.variety);
  const reviewHref = `/coffees/${coffee.slug}/review`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(reviewHref)}`;
  const ctaHref = session?.user ? reviewHref : loginHref;
  const publicDescription = getPublicDescription(coffee.descriptionAr);

  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-12">

          {/* صورة المحصول */}
          <CoffeeImage
            variant="detail"
            imagePath={coffee.imagePath}
            storedImageUrl={coffee.storedImageUrl}
            imageStorageProvider={coffee.imageStorageProvider}
            imageUrl={coffee.imageUrl}
            imagePermissionStatus={coffee.imagePermissionStatus}
            imageCredit={coffee.imageCredit}
            coffeeName={coffee.nameAr}
            roasteryName={coffee.roaster.nameAr}
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
          />

          {/* معلومات القرار */}
          <div className="flex flex-col justify-center gap-5">

            {/* 1. اسم المحصول */}
            <div>
              <h1 className="text-4xl font-black leading-tight text-stone-950 sm:text-5xl">
                {coffee.nameAr}
              </h1>

              {/* 2. المحمصة • الدولة • المعالجة */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <Coffee className="h-4 w-4 text-amber-700" />
                  {coffee.roaster.nameAr}
                </span>
                <span className="text-stone-300" aria-hidden>•</span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-amber-700" />
                  {coffee.originCountry.nameAr}
                  {regionName ? ` – ${regionName}` : ""}
                </span>
                <span className="text-stone-300" aria-hidden>•</span>
                <Badge variant="gold">{formatProcess(coffee.process, coffee.processLabel)}</Badge>
              </div>
            </div>

            {/* 3. التقييم */}
            <RatingDisplay rating={coffee.averageRating} count={coffee.reviewCount} />

            {/* 4. أفضل طريقة تحضير (مع label سياقي) */}
            <BestBrew coffee={coffee} />

            {/* 5. هل يشترونه مرة ثانية (فقط عند بيانات كافية) */}
            <WouldBuyAgainBadge
              brewStats={coffee.brewStats}
              reviewCount={coffee.reviewCount}
            />

            {/* 6. النكهات الأساسية (أوّل 3 فقط في الهيرو) */}
            <FlavorChips notes={coffee.flavorNotes} limit={3} />

            {/* 7. زر الإجراء الرئيسي */}
            <div className="flex flex-col gap-1.5">
              <Link
                href={ctaHref}
                className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-amber-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
              >
                {userReview ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {userReview ? "عدّل تقييمك" : "أضف تقييمك"}
              </Link>
              {!session?.user ? (
                <p className="text-xs text-stone-400">يتطلب تسجيل الدخول</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">

        {/* ── العمود الرئيسي ── */}
        <div className="space-y-8">

          {/* معلومات المحصول */}
          <section>
            <SectionTitle title="معلومات المحصول" description="تفاصيل تساعدك تفهم شخصية المحصول قبل الشراء أو التحضير." />
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <DetailRow label="الدولة"              value={coffee.originCountry.nameAr} />
              <DetailRow label="المنطقة"             value={regionName} />
              <DetailRow label="المعالجة"            value={formatProcess(coffee.process, coffee.processLabel)} />
              <DetailRow label="السلالة"             value={varietyName} />
              <DetailRow label="الارتفاع"            value={coffee.altitudeMeters ? `${coffee.altitudeMeters} متر` : null} />
              <DetailRow
                label="طرق التحضير المقترحة"
                value={coffee.recommendedBrewMethods.map(formatBrewMethod).join("، ")}
              />
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

          {publicDescription ? (
            <section>
              <SectionTitle title="الوصف" />
              <p className="mt-4 rounded-lg border border-stone-200 bg-white p-5 leading-8 text-stone-700">
                {publicDescription}
              </p>
            </section>
          ) : null}

          {/* تقييمات المستخدمين */}
          <section>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-stone-950">تقييمات المستخدمين</h2>
                {coffee.reviewCount > 0 && (
                  <span className="mt-1 block text-sm font-semibold text-stone-500">
                    {coffee.reviewCount} تقييم
                  </span>
                )}
              </div>
              <Link
                href={ctaHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
              >
                {userReview ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {userReview ? "عدّل تقييمك" : "أضف تقييمك"}
              </Link>
            </div>

            {/* تقييم المستخدم الحالي */}
            {userReview ? (
              <div className="mb-4 rounded-xl border-2 border-amber-200 bg-amber-50/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                    تقييمك
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-black text-stone-900">
                    {"★".repeat(userReview.rating)}{"☆".repeat(5 - userReview.rating)}
                    <span className="mr-1 text-stone-500">{userReview.rating}/5</span>
                  </span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
                    {formatBrewMethod(userReview.brewMethod)}
                  </span>
                  {userReview.wouldBuyAgain ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      يشتريها مرة ثانية
                    </span>
                  ) : null}
                </div>
                {userReview.body ? (
                  <p className="mt-3 text-sm leading-7 text-stone-700">{userReview.body}</p>
                ) : null}
              </div>
            ) : null}

            <Suspense fallback={<ReviewsSkeleton />}>
              <ReviewsList
                reviewsPromise={reviewsPromise}
                currentUserId={session?.user?.id}
                basePath={`/coffees/${coffee.slug}`}
              />
            </Suspense>

            {/* CTA ثانٍ — بعد قراءة التقييمات */}
            <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-center">
              <p className="font-bold text-stone-900">جرّبت هذا المحصول؟</p>
              <p className="mt-1 text-sm text-stone-500">
                شارك تجربتك مع طريقة التحضير والنكهات التي لاحظتها
              </p>
              <Link
                href={ctaHref}
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
              >
                <Plus className="h-4 w-4" />
                {userReview ? "عدّل تقييمك" : "أضف تقييمك"}
              </Link>
              {!session?.user ? (
                <p className="mt-2 text-xs text-stone-400">يتطلب تسجيل الدخول</p>
              ) : null}
            </div>
          </section>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <QuickSummaryCard coffee={coffee} />
        </aside>
      </div>

      <SiteFooter />
    </main>
  );
}
