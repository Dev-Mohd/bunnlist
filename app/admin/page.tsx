import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "لوحة الإدارة — BunnList" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();

  const [userCount, coffeeCount, reviewCount, needsImageWork] = await Promise.all([
    prisma.user.count(),
    prisma.coffeeLot.count(),
    prisma.review.count(),
    prisma.coffeeLot.count({ where: { imagePermissionStatus: { not: "APPROVED" } } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-stone-950">لوحة الإدارة</h1>
        <p className="mt-1 text-sm text-stone-500">
          مرحباً {session.user?.name ?? "مدير"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="المستخدمون" value={userCount} />
        <StatCard label="المحاصيل" value={coffeeCount} />
        <StatCard label="التقييمات" value={reviewCount} />
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-bold text-stone-800">روابط سريعة</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/coffees"
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            إدارة المحاصيل
          </Link>
          <Link
            href="/admin/missing-images"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            محاصيل تحتاج صور
            {needsImageWork > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-600 px-1.5 text-xs font-bold text-white">
                {needsImageWork}
              </span>
            )}
          </Link>
          <Link
            href="/coffees"
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            تصفح المحاصيل
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <p className="text-3xl font-black text-amber-700">{value}</p>
      <p className="mt-1 text-sm font-semibold text-stone-600">{label}</p>
    </div>
  );
}
