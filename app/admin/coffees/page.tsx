import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, ImageOff } from "lucide-react";
import { getAllCoffeeLotsAdmin } from "@/actions/admin";
import { getCoffeeImageUrl, getPublicCoffeeImageUrl } from "@/lib/storage";
import { formatReviewDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { CoffeeListActions } from "./coffee-list-actions";

export const metadata = { title: "إدارة المحاصيل — BunnList" };

type PageProps = {
  searchParams?: Promise<{ filter?: string }>;
};

const FILTER_OPTIONS = [
  { label: "الكل",          value: "" },
  { label: "مسودة",         value: "drafts" },
  { label: "بدون صورة",    value: "no-image" },
  { label: "بدون تقييمات", value: "no-reviews" },
  { label: "تقييم منخفض",  value: "low-rating" },
] as const;

export default async function AdminCoffeesPage({ searchParams }: PageProps) {
  const resolved = searchParams ? await searchParams : {};
  const activeFilter = resolved.filter ?? "";

  const lots = await getAllCoffeeLotsAdmin({ filter: activeFilter });

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Header ── */}
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

      {/* ── فلاتر بسيطة (Link-based, لا Client JS) ── */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={opt.value ? `/admin/coffees?filter=${opt.value}` : "/admin/coffees"}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              activeFilter === opt.value
                ? "border-amber-700 bg-amber-700 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50",
            )}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {lots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white py-20 text-center">
          <p className="text-lg font-bold text-stone-600">
            {activeFilter ? "لا توجد نتائج لهذا الفلتر" : "لا توجد محاصيل بعد"}
          </p>
          <p className="mt-1 text-sm text-stone-400">
            {activeFilter ? "جرّب فلتراً مختلفاً أو" : "ابدأ بإضافة أول محصول قهوة"}
          </p>
          {activeFilter ? (
            <Link
              href="/admin/coffees"
              className="mt-4 text-sm font-semibold text-amber-700 underline hover:text-amber-800"
            >
              عرض الكل
            </Link>
          ) : (
            <Link
              href="/admin/coffees/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-800"
            >
              <Plus className="h-4 w-4" />
              إضافة محصول
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 text-right">المحصول</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">المحمصة</th>
                <th className="hidden px-4 py-3 text-center md:table-cell">الحالة</th>
                <th className="px-4 py-3 text-center">التقييمات</th>
                <th className="hidden px-4 py-3 text-center sm:table-cell">متوسط التقييم</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lots.map((lot) => {
                const imageUrl =
                  lot.imagePermissionStatus === "APPROVED" && lot.imageType === "OFFICIAL"
                    ? getPublicCoffeeImageUrl(lot)
                    : getCoffeeImageUrl(lot.imagePath);
                const hasVisibleImage =
                  (lot.imagePermissionStatus === "APPROVED" &&
                    lot.imageType === "OFFICIAL" &&
                    Boolean(lot.imageUrl)) ||
                  Boolean(lot.imagePath);
                return (
                  <tr key={lot.id} className="transition hover:bg-stone-50">

                    {/* ── المحصول: صورة + اسم + slug + آخر تحديث ── */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                          {hasVisibleImage ? (
                            <Image
                              src={imageUrl}
                              alt={lot.nameAr}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-stone-300">
                              <ImageOff className="h-5 w-5" />
                              <span className="text-[10px] font-semibold">لا صورة</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-bold text-stone-900">{lot.nameAr}</p>
                            {!hasVisibleImage && (
                              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                بدون صورة
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-stone-400" dir="ltr">
                            {lot.slug}
                          </p>
                          <p className="mt-0.5 text-[10px] text-stone-300">
                            {formatReviewDate(lot.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* ── المحمصة ── */}
                    <td className="hidden px-4 py-3 text-stone-600 sm:table-cell">
                      {lot.roaster.nameAr}
                    </td>

                    {/* ── حالة النشر ── */}
                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      {lot.publishedAt ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          منشور
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
                          مسودة
                        </span>
                      )}
                    </td>

                    {/* ── عدد التقييمات ── */}
                    <td className="px-4 py-3 text-center">
                      {lot.reviewCount > 0 ? (
                        <span className="font-semibold text-stone-700">{lot.reviewCount}</span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* ── متوسط التقييم ── */}
                    <td className="hidden px-4 py-3 text-center sm:table-cell">
                      {lot.reviewCount > 0 ? (
                        <span
                          className={cn(
                            "font-semibold",
                            lot.averageRating >= 4
                              ? "text-emerald-700"
                              : lot.averageRating >= 3
                                ? "text-amber-700"
                                : "text-red-600",
                          )}
                        >
                          {lot.averageRating.toFixed(1)} ★
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* ── إجراءات ── */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admin/coffees/${lot.id}/edit`}
                          className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          تعديل
                        </Link>
                        <CoffeeListActions
                          coffeeId={lot.id}
                          nameAr={lot.nameAr}
                          reviewCount={lot.reviewCount}
                        />
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
