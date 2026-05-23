import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Beaker, Coffee, Filter, Snowflake, Star } from "lucide-react";
import { getCoffeeLots, getLatestCoffeeReviews, type LatestCoffeeReview } from "@/actions/coffees";
import { CoffeeCard } from "@/components/coffees/coffee-card";
import { CoffeeSearchBar } from "@/components/coffees/coffee-search-bar";
import { Card } from "@/components/ui/card";
import { MotionGrid, MotionGridItem, MotionPage } from "@/components/ui/motion-primitives";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";
import { formatBrewMethod } from "@/lib/coffee-labels";

const searchSuggestions = [
  { label: "V60", href: "/coffees?brewMethods=V60" },
  { label: "Espresso", href: "/coffees?brewMethods=ESPRESSO" },
  { label: "إثيوبيا", href: "/coffees?q=%D8%A5%D8%AB%D9%8A%D9%88%D8%A8%D9%8A%D8%A7" },
  { label: "جيشا", href: "/coffees?q=%D8%AC%D9%8A%D8%B4%D8%A7" },
  { label: "كامل ستيب", href: "/coffees?q=%D9%83%D8%A7%D9%85%D9%84%20%D8%B3%D8%AA%D9%8A%D8%A8" },
];

const brewMethodCards = [
  {
    title: "V60",
    description: "محاصيل مناسبة للترشيح اليومي",
    href: "/coffees?brewMethods=V60",
    icon: Filter,
  },
  {
    title: "Espresso",
    description: "محاصيل مناسبة لاستخلاص مركز وواضح",
    href: "/coffees?brewMethods=ESPRESSO",
    icon: Coffee,
  },
  {
    title: "Chemex",
    description: "محاصيل خفيفة ونظيفة",
    href: "/coffees?brewMethods=CHEMEX",
    icon: Beaker,
  },
  {
    title: "Cold Brew",
    description: "محاصيل مناسبة للتحضير البارد",
    href: "/coffees?brewMethods=COLD_BREW",
    icon: Snowflake,
  },
];

const quickPicks = [
  { label: "الأعلى تقييمًا", href: "/coffees?sort=top-rated" },
  { label: "الأكثر تقييمًا", href: "/coffees?sort=most-reviewed" },
  { label: "محاصيل جديدة", href: "/coffees?sort=latest" },
];

async function DecisionCoffeeSection() {
  const coffees = await getCoffeeLots({ sort: "latest", perPage: 6 });

  return (
      <section className="space-y-5">
        <SectionHeading
          title="محاصيل تساعدك تقرر"
          description="مختارات حديثة تعرض التقييم وطريقة التحضير المقترحة قبل الدخول للتفاصيل."
          href="/coffees?sort=latest"
        />
      <MotionGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {coffees.items.map((coffee) => (
          <MotionGridItem key={coffee.id}>
            <CoffeeCard coffee={coffee} />
          </MotionGridItem>
        ))}
      </MotionGrid>
    </section>
  );
}

function ReviewCard({ review }: { review: LatestCoffeeReview }) {
  const body = review.body?.trim();
  const reviewerName = review.user.name ?? "مستخدم BunnList";
  const reviewDate = new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(review.createdAt);

  return (
    <Link href={`/coffees/${review.coffeeLot.slug}`} className="group block h-full">
      <Card className="h-full p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">{review.coffeeLot.roaster.name}</p>
            <h3 className="mt-2 font-bold leading-7 text-stone-950 group-hover:text-amber-900">{review.coffeeLot.name}</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-sm font-bold text-stone-800">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            {review.rating}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-900">{formatBrewMethod(review.brewMethod)}</span>
          <span className="rounded-md bg-stone-100 px-2.5 py-1 text-stone-700">
            {review.wouldBuyAgain ? "يشتريه مرة ثانية" : "لا يفضّل تكراره"}
          </span>
        </div>
        <p className="mt-4 text-xs font-semibold text-stone-500">
          {reviewerName} · {reviewDate}
        </p>
        {body ? <p className="mt-4 line-clamp-3 text-sm leading-7 text-stone-600">{body}</p> : null}
      </Card>
    </Link>
  );
}

async function CommunityReviewsSection() {
  const reviews = await getLatestCoffeeReviews(3);

  if (!reviews.length) {
    return null;
  }

  return (
    <section className="space-y-5">
      <SectionHeading title="آخر تجارب المجتمع" description="تجارب قصيرة تساعدك تفهم أداء المحصول في التحضير الفعلي." />
      <div className="grid gap-5 md:grid-cols-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ title, description, href }: { title: string; description: string; href?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-black text-stone-950">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">{description}</p>
      </div>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-2 text-sm font-bold text-amber-800 hover:text-amber-900">
          عرض الكل
          <ArrowLeft className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-[430px] animate-pulse rounded-lg bg-stone-200" />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />
      <MotionPage>
        <section className="border-b border-stone-200 bg-[radial-gradient(circle_at_top_left,rgba(180,83,9,0.16),transparent_34%),linear-gradient(180deg,#fff7ed_0%,#fafaf9_76%)]">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
                دليلك قبل شراء المحصول القادم
              </p>
              <h1 className="text-4xl font-black leading-tight text-stone-950 sm:text-5xl lg:text-6xl">
                اعرف وش تشتري وكيف تحضّر محصولك
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-9 text-stone-700">
                تقييمات وتجارب محبي القهوة تساعدك تختار محصول مناسب للإسبريسو أو V60 أو الكيمكس قبل الشراء.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/coffees"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-amber-700 px-5 text-base font-semibold text-white shadow-sm transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
                >
                  استكشف المحاصيل
                </Link>
                <Link
                  href="/coffees"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-stone-300 bg-white px-5 text-base font-semibold text-stone-800 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
                >
                  اختر محصولًا لتقييمه
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <section className="max-w-3xl space-y-4">
          <div>
            <h2 className="text-2xl font-black text-stone-950">عندك محصول في بالك؟</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">ابحث مباشرة أو ابدأ من اقتراح سريع.</p>
          </div>
          <CoffeeSearchBar targetPath="/coffees" placeholder="ابحث باسم المحصول أو المحمصة..." />
          <div className="flex flex-wrap gap-2">
            {searchSuggestions.map((suggestion) => (
              <Link
                key={suggestion.label}
                href={suggestion.href}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 transition hover:border-amber-300 hover:text-amber-900"
              >
                {suggestion.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeading title="ابدأ حسب طريقة التحضير" description="اختصر القرار حسب الأداة التي تستخدمها غالبًا." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {brewMethodCards.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} className="group block h-full">
                  <Card className="h-full p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <div className="mb-5 grid h-11 w-11 place-items-center rounded-md bg-amber-100 text-amber-900">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-black text-stone-950 group-hover:text-amber-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{item.description}</p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-stone-950">اختيارات سريعة</h2>
          <div className="flex flex-wrap gap-3">
            {quickPicks.map((pick) => (
              <Link
                key={pick.label}
                href={pick.href}
                className="rounded-md border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-800 transition hover:border-amber-300 hover:text-amber-900"
              >
                {pick.label}
              </Link>
            ))}
          </div>
        </section>

        <Suspense fallback={<SectionSkeleton />}>
          <DecisionCoffeeSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <CommunityReviewsSection />
        </Suspense>

        <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-8 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-stone-950">جرّبت محصول مؤخرًا؟</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-700">
                شارك تجربتك وساعد غيرك يعرف وش يشتري وكيف يحضّره.
              </p>
            </div>
            <Link
              href="/coffees"
              className="inline-flex h-11 items-center justify-center rounded-md bg-amber-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
            >
              اختر محصولًا لتقييمه
            </Link>
          </div>
        </section>
        </div>
      </MotionPage>
      <SiteFooter />
    </main>
  );
}
