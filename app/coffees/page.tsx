import { Suspense } from "react";
import { BrewMethod, CoffeeProcess } from "@prisma/client";
import { getCoffeeFilters, getCoffeeLots, type CoffeeLotQuery, type CoffeeSort } from "@/actions/coffees";
import { CoffeeGrid } from "@/components/coffees/coffee-grid";
import { CoffeePagination } from "@/components/coffees/coffee-pagination";
import { CoffeeSearchBar } from "@/components/coffees/coffee-search-bar";
import { CoffeeSortSelect } from "@/components/coffees/coffee-sort-select";
import { CoffeeFilters } from "@/components/filters/coffee-filters";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";

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

  return {
    page: Number(getString(searchParams.page) ?? "1") || 1,
    query: getString(searchParams.q),
    roasterIds: getList(searchParams.roasterIds),
    originCountryIds: getList(searchParams.originCountryIds),
    processingMethods: getEnumList(searchParams.processingMethods, Object.values(CoffeeProcess)),
    flavorNotes: getList(searchParams.flavorNotes),
    brewMethods: getEnumList(searchParams.brewMethods, Object.values(BrewMethod)),
    sort,
  };
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
      query.brewMethods?.length,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <CoffeeFilters options={filters} />
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-stone-600">
            {result.total} محصول
          </p>
          <CoffeeSortSelect value={query.sort ?? "latest"} />
        </div>
        <CoffeeGrid
          coffees={result.items}
          emptyTitle={hasFilters ? "لا توجد محاصيل تطابق الفلاتر" : "لا توجد محاصيل حالياً"}
          emptyDescription={hasFilters ? "جرّب توسيع البحث أو إزالة بعض الفلاتر." : undefined}
          clearHref={hasFilters ? "/coffees" : undefined}
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
        <div className="h-20 animate-pulse rounded-lg bg-stone-200" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-lg bg-stone-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function CoffeesPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  const query = parseQuery(rawSearchParams);

  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black text-stone-950 sm:text-4xl">محاصيل القهوة</h1>
            <p className="mt-3 text-base leading-8 text-stone-600">
              ابحث وفلتر حسب المحمصة، الدولة، المعالجة، النكهات، وطريقة التحضير.
            </p>
          </div>
          <div className="mt-6 max-w-3xl">
            <CoffeeSearchBar />
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
