import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCoffeeLotForEdit } from "@/actions/admin";
import { getCoffeeImageUrl, getPublicCoffeeImageUrl } from "@/lib/storage";
import { CoffeeForm } from "@/components/admin/coffee-form";

export const metadata = { title: "تعديل المحصول — BunnList" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCoffeePage({ params }: Props) {
  const { id } = await params;

  const [lot, roasters, countries] = await Promise.all([
    getCoffeeLotForEdit(id),
    prisma.roaster.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
    prisma.originCountry.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
  ]);

  if (!lot) notFound();

  const initialImageUrl =
    lot.imageUrl && lot.imagePermissionStatus === "APPROVED" && lot.imageType === "OFFICIAL"
      ? getPublicCoffeeImageUrl(lot)
      : lot.imagePath
        ? getCoffeeImageUrl(lot.imagePath)
        : undefined;

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
        <h1 className="mt-2 text-2xl font-black text-stone-950">
          تعديل: {lot.nameAr}
        </h1>
      </div>

      <CoffeeForm
        initialData={lot}
        roasters={roasters}
        countries={countries}
        mode="edit"
        initialImageUrl={initialImageUrl}
      />
    </div>
  );
}
