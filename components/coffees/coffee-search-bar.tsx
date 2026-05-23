"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CoffeeSearchBar({
  placeholder = "ابحث باسم المحصول أو المحمصة",
  targetPath,
  className,
}: {
  placeholder?: string;
  targetPath?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = query.trim();

    params.delete("page");
    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    } else {
      params.delete("q");
    }

    router.push(`${targetPath ?? pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className={className ?? "flex w-full flex-col gap-3 sm:flex-row"}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="h-12 border-stone-300 bg-white pr-10 text-base shadow-sm"
          aria-label="بحث"
        />
      </div>
      <Button type="submit" className="h-12 px-5 text-base">
        <Search className="h-4 w-4" />
        بحث
      </Button>
    </form>
  );
}
