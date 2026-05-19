import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CoffeePaginationProps = {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
};

function getHref(searchParams: CoffeePaginationProps["searchParams"], page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value) {
      params.set(key, value);
    }
  }

  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }

  return `/coffees?${params.toString()}`;
}

export function CoffeePagination({ page, totalPages, searchParams }: CoffeePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="ترقيم الصفحات">
      <Link
        href={getHref(searchParams, previousPage)}
        aria-disabled={page === 1}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700",
          page === 1 && "pointer-events-none opacity-45",
        )}
      >
        <ChevronRight className="h-4 w-4" />
        السابق
      </Link>
      <span className="px-3 text-sm font-semibold text-stone-600">
        صفحة {page} من {totalPages}
      </span>
      <Link
        href={getHref(searchParams, nextPage)}
        aria-disabled={page === totalPages}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700",
          page === totalPages && "pointer-events-none opacity-45",
        )}
      >
        التالي
        <ChevronLeft className="h-4 w-4" />
      </Link>
    </nav>
  );
}
