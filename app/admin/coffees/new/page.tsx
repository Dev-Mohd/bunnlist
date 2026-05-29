import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CoffeeForm } from "@/components/admin/coffee-form";

export const metadata = { title: "إضافة محصول — BunnList" };
export const dynamic = "force-dynamic";

export default async function NewCoffeePage() {
  const [roasters, countries] = await Promise.all([
    prisma.roaster.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
    prisma.originCountry.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin/coffees"
          className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800"
        >
          <ChevronRight className="h-4 w-4" />
          المحاصيل
        </Link>
        <h1 className="mt-2 text-2xl font-black text-stone-950">إضافة محصول جديد</h1>
      </div>

      <CoffeeForm roasters={roasters} countries={countries} mode="create" />
    </div>
  );
}
