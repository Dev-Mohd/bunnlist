"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import type { CoffeeSort } from "@/actions/coffees";

const sortLabels: Record<CoffeeSort, string> = {
  latest: "الأحدث",
  "top-rated": "الأعلى تقييماً",
  "most-reviewed": "الأكثر تقييماً",
};

export function CoffeeSortSelect({ value }: { value: CoffeeSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateSort(nextSort: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", nextSort);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
      الترتيب
      <Select value={value} onChange={(event) => updateSort(event.target.value)} aria-label="ترتيب المحاصيل">
        {Object.entries(sortLabels).map(([sort, label]) => (
          <option key={sort} value={sort}>
            {label}
          </option>
        ))}
      </Select>
    </label>
  );
}
