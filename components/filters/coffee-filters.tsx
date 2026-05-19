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
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-stone-950">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function CoffeeFilters({ options }: CoffeeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      <Button variant="outline" className="w-full" onClick={clearFilters}>
        مسح الفلاتر
      </Button>
      <Separator />
      <FilterSection title="المحمصة">
        {options.roasters.map((roaster) => (
          <label key={roaster.id} className="flex cursor-pointer items-center gap-3 text-sm text-stone-700">
            <Checkbox
              checked={getValues(searchParams, "roasterIds").includes(roaster.id)}
              onChange={(event) => updateValue("roasterIds", roaster.id, event.target.checked)}
            />
            {roaster.name}
          </label>
        ))}
      </FilterSection>
      <FilterSection title="الدولة">
        {options.originCountries.map((country) => (
          <label key={country.id} className="flex cursor-pointer items-center gap-3 text-sm text-stone-700">
            <Checkbox
              checked={getValues(searchParams, "originCountryIds").includes(country.id)}
              onChange={(event) => updateValue("originCountryIds", country.id, event.target.checked)}
            />
            {country.nameAr}
          </label>
        ))}
      </FilterSection>
      <FilterSection title="المعالجة">
        {options.processingMethods.map((process) => (
          <label key={process} className="flex cursor-pointer items-center gap-3 text-sm text-stone-700">
            <Checkbox
              checked={getValues(searchParams, "processingMethods").includes(process)}
              onChange={(event) => updateValue("processingMethods", process, event.target.checked)}
            />
            {formatProcess(process)}
          </label>
        ))}
      </FilterSection>
      <FilterSection title="النكهات">
        {options.flavorNotes.map((note) => (
          <label key={note.name} className="flex cursor-pointer items-center justify-between gap-3 text-sm text-stone-700">
            <span className="flex items-center gap-3">
              <Checkbox
                checked={getValues(searchParams, "flavorNotes").includes(note.name)}
                onChange={(event) => updateValue("flavorNotes", note.name, event.target.checked)}
              />
              {note.name}
            </span>
            <span className="text-xs text-stone-400">{note.count}</span>
          </label>
        ))}
      </FilterSection>
      <FilterSection title="طريقة التحضير">
        {options.brewMethods.map((method) => (
          <label key={method} className="flex cursor-pointer items-center gap-3 text-sm text-stone-700">
            <Checkbox
              checked={getValues(searchParams, "brewMethods").includes(method)}
              onChange={(event) => updateValue("brewMethods", method, event.target.checked)}
            />
            {formatBrewMethod(method)}
          </label>
        ))}
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
            </span>
          }
        >
          {content}
        </Sheet>
      </div>
      <aside className="hidden rounded-lg border border-stone-200 bg-white p-5 shadow-sm lg:block">
        <div className="mb-5 flex items-center gap-2 text-stone-950">
          <SlidersHorizontal className="h-5 w-5" />
          <h2 className="text-lg font-bold">الفلاتر</h2>
        </div>
        {content}
      </aside>
    </>
  );
}
