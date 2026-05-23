import { Suspense } from "react";
import Link from "next/link";
import { BrewMethod, CoffeeProcess } from "@prisma/client";
import { getCoffeeFilters, getCoffeeLots, type CoffeeLotQuery, type CoffeeSort } from "@/actions/coffees";
import { CoffeeGrid } from "@/components/coffees/coffee-grid";
import { CoffeePagination } from "@/components/coffees/coffee-pagination";
import { CoffeeSearchBar } from "@/components/coffees/coffee-search-bar";
import { CoffeeSortSelect } from "@/components/coffees/coffee-sort-select";
import { CoffeeFilters } from "@/components/filters/coffee-filters";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getList(value: string | string[] | undefined) {
  const rawValue = getString(value);
  return rawValue ? rawValue.split(",").filter(Boolean) : [];
}

function getEnumList<T extends string>(value: string | string[] | undefined, allowed: readonly T[]) {
  const allowedSet = new Set(allowed);
  return getList(value).filter((item): item is T => allowedSet.has(item as T));
}

function parseQuery(searchParams: Record<string, string | string[] | undefined>): CoffeeLotQuery {
  const sortParam = getString(searchParams.sort);
  const sort: CoffeeSort =
    sortParam === "top-rated" || sortParam === "most-reviewed" || sortParam === "latest" ? sortParam : "latest";

  const minRatingRaw = Number(getString(searchParams.minRating) ?? "");
  const minRating =
    Number.isFinite(minRatingRaw) && minRatingRaw >= 1 && minRatingRaw <= 5
      ? minRatingRaw
      : undefined;

  return {
    page: Number(getString(searchParams.page) ?? "1") || 1,
    query: getString(searchParams.q),
    roasterIds: getList(searchParams.roasterIds),
    originCountryIds: getList(searchParams.originCountryIds),
    processingMethods: getEnumList(searchParams.processingMethods, Object.values(CoffeeProcess)),
    flavorNotes: getList(searchParams.flavorNotes),
    brewMethods: getEnumList(searchParams.brewMethods, Object.values(BrewMethod)),
    sort,
    minRating,
  };
}

function getActiveFilterText(query: CoffeeLotQuery) {
  const count =
    (query.roasterIds?.length ?? 0) +
    (query.originCountryIds?.length ?? 0) +
    (query.processingMethods?.length ?? 0) +
    (query.flavorNotes?.length ?? 0) +
    (query.brewMethods?.length ?? 0) +
    (query.minRating ? 1 : 0) +
    (query.query ? 1 : 0);

  if (!count) {
    return "بدون فلاتر نشطة";
  }

  return `${count} فلتر نشط`;
}

async function CoffeeListContent({
  query,
  rawSearchParams,
}: {
  query: CoffeeLotQuery;
  rawSearchParams: Record<string, string | string[] | undefined>;
}) {
  const [filters, result] = await Promise.all([getCoffeeFilters(), getCoffeeLots(query)]);
  const hasFilters = Boolean(
    query.query ||
      query.roasterIds?.length ||
      query.originCountryIds?.length ||
      query.processingMethods?.length ||
      query.flavorNotes?.length ||
      query.brewMethods?.length ||
      query.minRating,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <CoffeeFilters options={filters} />
      <div className="space-y-5">
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-black text-stone-950">
                {result.total.toLocaleString("ar-SA")} محصول
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {query.query ? `نتائج البحث عن "${query.query}"` : getActiveFilterText(query)}
              </p>
            </div>
            {hasFilters ? (
              <Link
                href="/coffees"
                className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 transition hover:border-amber-300 hover:text-amber-900 sm:mr-auto"
              >
                مسح البحث والفلاتر
              </Link>
            ) : null}
            <CoffeeSortSelect value={query.sort ?? "latest"} />
          </div>
        </div>
        <CoffeeGrid
          coffees={result.items}
          emptyTitle={hasFilters ? "ما لقينا محاصيل تطابق اختيارك" : "لا توجد محاصيل حالياً"}
          emptyDescription={
            hasFilters
              ? "جرّب إزالة بعض الفلاتر أو البحث باسم المحمصة/المحصول بطريقة أبسط."
              : "عند إضافة محاصيل منشورة ستظهر هنا مباشرة."
          }
          clearHref={hasFilters ? "/coffees" : undefined}
          clearLabel="مسح البحث والفلاتر"
        />
        <CoffeePagination page={result.page} totalPages={result.totalPages} searchParams={rawSearchParams} />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="hidden h-[720px] animate-pulse rounded-lg bg-stone-200 lg:block" />
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-lg bg-stone-200 sm:h-20" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-[430px] animate-pulse rounded-lg bg-stone-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

const META_DESCRIPTION =
  "اكتشف محاصيل القهوة المختارة من أبرز المحامص. فلتر حسب الدولة، المعالجة، النكهات، وطريقة التحضير.";

export const metadata = {
  title: "تصفح محاصيل القهوة | BunnList",
  description: META_DESCRIPTION,
  openGraph: {
    title: "تصفح محاصيل القهوة | BunnList",
    description: META_DESCRIPTION,
    type: "website",
  },
};

export default async function CoffeesPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  const query = parseQuery(rawSearchParams);

  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
                دليل شراء سريع
              </p>
              <h1 className="text-3xl font-black text-stone-950 sm:text-4xl">اكتشف محاصيل القهوة</h1>
              <p className="mt-3 text-base leading-8 text-stone-600">
                ابحث باسم المحصول أو المحمصة، ثم فلتر حسب طريقة التحضير والنكهات والمعالجة حتى تصل للخيار الأنسب.
              </p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 shadow-sm">
              <p className="mb-2 text-sm font-bold text-stone-700">عندك محصول في بالك؟</p>
              <CoffeeSearchBar placeholder="ابحث باسم المحصول أو المحمصة..." />
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ListSkeleton />}>
          <CoffeeListContent query={query} rawSearchParams={rawSearchParams} />
        </Suspense>
      </div>
      <SiteFooter />
    </main>
  );
}
