import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { getCoffeeLots } from "@/actions/coffees";
import { CoffeeCard } from "@/components/coffees/coffee-card";
import { CoffeeSearchBar } from "@/components/coffees/coffee-search-bar";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";

export const dynamic = "force-dynamic";

const QUICK_FILTERS = [
  { label: "مناسب لـ V60",    href: "/coffees?brewMethods=V60" },
  { label: "مناسب للإسبريسو", href: "/coffees?brewMethods=ESPRESSO" },
  { label: "أعلى تقييماً",    href: "/coffees?sort=top-rated" },
  { label: "محاصيل جديدة",   href: "/coffees?sort=latest" },
] as const;

async function CoffeeSection({
  title,
  description,
  sort,
}: {
  title: string;
  description: string;
  sort: "latest" | "top-rated";
}) {
  const coffees = await getCoffeeLots({ sort, perPage: 6 });

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-stone-950">{title}</h2>
          <p className="mt-2 text-sm leading-7 text-stone-600">{description}</p>
        </div>
        <Link
          href={`/coffees?sort=${sort}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-amber-800 hover:text-amber-900"
        >
          عرض الكل
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {coffees.items.map((coffee) => (
          <CoffeeCard key={coffee.id} coffee={coffee} />
        ))}
      </div>
    </section>
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

      {/* Hero */}
      <section className="border-b border-stone-200 bg-[radial-gradient(circle_at_top_left,rgba(180,83,9,0.16),transparent_34%),linear-gradient(180deg,#fff7ed_0%,#fafaf9_76%)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
              دليلك قبل شراء المحصول القادم
            </p>
            <h1 className="text-4xl font-black leading-[1.2] text-stone-950 sm:text-5xl md:text-6xl">
              اعرف وش تشتري وكيف تحضّر محصولك
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-700 sm:text-lg sm:leading-9">
              تقييمات وتجارب محبي القهوة تساعدك تعرف هل المحصول يناسب الإسبريسو أو V60 أو الكيمكس قبل الشراء.
            </p>
            <div className="mt-6 max-w-2xl">
              <CoffeeSearchBar
                placeholder="ابحث باسم المحصول أو المحمصة..."
                targetPath="/coffees"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_FILTERS.map((filter) => (
                <Link
                  key={filter.label}
                  href={filter.href}
                  className="inline-flex items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<SectionSkeleton />}>
          <CoffeeSection
            title="محاصيل تساعدك تقرر"
            description="ابدأ من المحاصيل المضافة حديثًا وشوف تقييم الناس وطريقة التحضير الأنسب."
            sort="latest"
          />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <CoffeeSection
            title="الأعلى تقييماً"
            description="محاصيل حصلت على أعلى تقييمات من المجتمع."
            sort="top-rated"
          />
        </Suspense>
      </div>

      <SiteFooter />
    </main>
  );
}
