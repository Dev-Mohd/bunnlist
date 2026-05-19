import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { getCoffeeLots } from "@/actions/coffees";
import { CoffeeGrid } from "@/components/coffees/coffee-grid";
import { CoffeeSearchBar } from "@/components/coffees/coffee-search-bar";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";

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
        <Link href={`/coffees?sort=${sort}`} className="inline-flex items-center gap-2 text-sm font-bold text-amber-800 hover:text-amber-900">
          عرض الكل
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
      <CoffeeGrid coffees={coffees.items} />
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-80 animate-pulse rounded-lg bg-stone-200" />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />
      <section className="border-b border-stone-200 bg-[radial-gradient(circle_at_top_left,rgba(180,83,9,0.16),transparent_34%),linear-gradient(180deg,#fff7ed_0%,#fafaf9_76%)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
              دليلك قبل شراء المحصول القادم
            </p>
            <h1 className="text-5xl font-black leading-[1.15] text-stone-950 md:text-6xl">
              BunnList — منصة تقييم محاصيل القهوة المختصة
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-9 text-stone-700">
              اكتشف محاصيل القهوة، اقرأ تجارب الناس، واعرف طريقة التحضير الأنسب لكل محصول قبل ما تشتري.
            </p>
            <div className="mt-8 max-w-2xl">
              <CoffeeSearchBar targetPath="/coffees" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
        <Suspense fallback={<SectionSkeleton />}>
          <CoffeeSection
            title="أحدث المحاصيل"
            description="محاصيل مضافة حديثاً من محامص سعودية وقهوة من مناطق مختلفة."
            sort="latest"
          />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <CoffeeSection
            title="الأعلى تقييماً"
            description="محاصيل لديها تقييمات فعلية من المستخدمين، مرتبة حسب المتوسط."
            sort="top-rated"
          />
        </Suspense>
      </div>
      <SiteFooter />
    </main>
  );
}
