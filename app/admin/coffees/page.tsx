import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { getAllCoffeeLotsAdmin } from "@/actions/admin";
import { getCoffeeImageUrl } from "@/lib/storage";
import { CoffeeListActions } from "./coffee-list-actions";

export const metadata = { title: "إدارة المحاصيل — BunnList" };

export default async function AdminCoffeesPage() {
  const lots = await getAllCoffeeLotsAdmin();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-stone-950">المحاصيل</h1>
          <p className="mt-1 text-sm text-stone-500">{lots.length} محصول</p>
        </div>
        <Link
          href="/admin/coffees/new"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-800"
        >
          <Plus className="h-4 w-4" />
          إضافة محصول
        </Link>
      </div>

      {lots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white py-20 text-center">
          <p className="text-lg font-bold text-stone-600">لا توجد محاصيل بعد</p>
          <p className="mt-1 text-sm text-stone-400">ابدأ بإضافة أول محصول قهوة</p>
          <Link
            href="/admin/coffees/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-800"
          >
            <Plus className="h-4 w-4" />
            إضافة محصول
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 text-right">المحصول</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">المحمصة</th>
                <th className="px-4 py-3 text-center">التقييمات</th>
                <th className="hidden px-4 py-3 text-center sm:table-cell">المتوسط</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lots.map((lot) => {
                const imageUrl = getCoffeeImageUrl(lot.imagePath);
                return (
                  <tr key={lot.id} className="transition hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                          {lot.imagePath ? (
                            <Image
                              src={imageUrl}
                              alt={lot.nameAr}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-stone-300 text-xs">
                              لا صورة
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{lot.nameAr}</p>
                          <p className="text-xs text-stone-400" dir="ltr">
                            {lot.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-stone-600 sm:table-cell">
                      {lot.roaster.nameAr}
                    </td>
                    <td className="px-4 py-3 text-center text-stone-600">
                      {lot.reviewCount}
                    </td>
                    <td className="hidden px-4 py-3 text-center sm:table-cell">
                      {lot.reviewCount > 0 ? (
                        <span className="font-semibold text-amber-700">
                          {lot.averageRating.toFixed(1)} ★
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admin/coffees/${lot.id}/edit`}
                          className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          تعديل
                        </Link>
                        <CoffeeListActions coffeeId={lot.id} nameAr={lot.nameAr} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
