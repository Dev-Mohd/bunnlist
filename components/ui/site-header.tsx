import Link from "next/link";
import { Coffee, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-stone-950" aria-label="BunnList">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-700 text-white">
            <Coffee className="h-5 w-5" />
          </span>
          <span className="text-lg font-black" dir="ltr">
            BunnList
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/coffees" className="rounded-md px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100">
            المحاصيل
          </Link>
          <Button variant="outline" size="sm" disabled title="سيتوفر تسجيل الدخول في دفعة لاحقة">
            <LogIn className="h-4 w-4" />
            دخول
          </Button>
        </nav>
      </div>
    </header>
  );
}
