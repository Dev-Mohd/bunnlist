"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CoffeeFilterOptions } from "@/actions/coffees";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Sheet } from "@/components/ui/sheet";
import { formatBrewMethod, formatProcess } from "@/lib/coffee-labels";

type CoffeeFiltersProps = {
  options: CoffeeFilterOptions;
};

const filterKeys = ["roasterIds", "originCountryIds", "processingMethods", "flavorNotes", "brewMethods"];

function getValues(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  return value ? value.split(",").filter(Boolean) : [];
}

function FilterSection({
  title,
  children,
  description,
}: {
  title: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-stone-950">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p> : null}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function CoffeeFilters({ options }: CoffeeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roasterIds = getValues(searchParams, "roasterIds");
  const originCountryIds = getValues(searchParams, "originCountryIds");
  const processingMethods = getValues(searchParams, "processingMethods");
  const flavorNotes = getValues(searchParams, "flavorNotes");
  const brewMethods = getValues(searchParams, "brewMethods");
  const activeFilterCount =
    roasterIds.length +
    originCountryIds.length +
    processingMethods.length +
    flavorNotes.length +
    brewMethods.length +
    (searchParams.get("q") ? 1 : 0);

  function updateValue(key: string, value: string, checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    const values = new Set(getValues(params, key));

    if (checked) {
      values.add(value);
    } else {
      values.delete(value);
    }

    params.delete("page");
    if (values.size) {
      params.set(key, Array.from(values).join(","));
    } else {
      params.delete(key);
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of filterKeys) params.delete(key);
    params.delete("q");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const content = (
    <div className="space-y-6">
      <Button variant="outline" className="w-full justify-center" onClick={clearFilters} disabled={!activeFilterCount}>
        {activeFilterCount ? `مسح الفلاتر (${activeFilterCount})` : "لا توجد فلاتر نشطة"}
      </Button>
      <Separator />
      <FilterSection title="المحمصة">
        {options.roasters.map((roaster) => (
          <label
            key={roaster.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
          >
            <Checkbox
              checked={roasterIds.includes(roaster.id)}
              onChange={(event) => updateValue("roasterIds", roaster.id, event.target.checked)}
            />
            <span className="min-w-0 break-words">{roaster.nameAr}</span>
          </label>
        ))}
      </FilterSection>
      <FilterSection title="الدولة">
        {options.originCountries.map((country) => (
          <label
            key={country.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
          >
            <Checkbox
              checked={originCountryIds.includes(country.id)}
              onChange={(event) => updateValue("originCountryIds", country.id, event.target.checked)}
            />
            <span className="min-w-0 break-words">{country.nameAr}</span>
          </label>
        ))}
      </FilterSection>
      <FilterSection title="المعالجة">
        {options.processingMethods.map((process) => (
          <label
            key={process}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
          >
            <Checkbox
              checked={processingMethods.includes(process)}
              onChange={(event) => updateValue("processingMethods", process, event.target.checked)}
            />
            <span className="min-w-0 break-words">{formatProcess(process)}</span>
          </label>
        ))}
      </FilterSection>
      <FilterSection title="النكهات">
        {options.flavorNotes.map((note) => (
          <label
            key={note.name}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
          >
            <span className="flex items-center gap-3">
              <Checkbox
                checked={flavorNotes.includes(note.name)}
                onChange={(event) => updateValue("flavorNotes", note.name, event.target.checked)}
              />
              <span className="min-w-0 break-words">{note.name}</span>
            </span>
            <span className="text-xs text-stone-400">{note.count}</span>
          </label>
        ))}
      </FilterSection>
      <FilterSection title="طريقة التحضير" description="اختَر الأداة التي تهمك وشوف المحاصيل المناسبة لها.">
        <div className="flex flex-wrap gap-2">
          {options.brewMethods.map((method) => {
            const checked = brewMethods.includes(method);

            return (
              <label key={method} className="cursor-pointer">
                <Checkbox
                  className="peer sr-only"
                  checked={checked}
                  onChange={(event) => updateValue("brewMethods", method, event.target.checked)}
                />
                <span className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:border-amber-300 hover:text-amber-900 peer-checked:border-amber-300 peer-checked:bg-amber-50 peer-checked:text-amber-900">
                  {formatBrewMethod(method)}
                </span>
              </label>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <Sheet
          title="فلترة المحاصيل"
          trigger={
            <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 shadow-sm">
              <SlidersHorizontal className="h-4 w-4" />
              الفلاتر
              {activeFilterCount ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                  {activeFilterCount}
                </span>
              ) : null}
            </span>
          }
        >
          {content}
        </Sheet>
      </div>
      <aside className="hidden rounded-lg border border-stone-200 bg-white p-5 shadow-sm lg:block">
        <div className="mb-5 flex items-center justify-between gap-3 text-stone-950">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            <h2 className="text-lg font-bold">الفلاتر</h2>
          </div>
          {activeFilterCount ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
              {activeFilterCount}
            </span>
          ) : null}
        </div>
        {content}
      </aside>
    </>
  );
}
