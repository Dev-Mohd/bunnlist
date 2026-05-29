// app/admin/import/page.tsx
// ============================================================
//  صفحة الأدمن: "استيراد القهوة"
//  - محمية: ADMIN فقط
//  - تعرض نموذج إدخال الرابط + قائمة الاستيرادات المعلّقة
// ============================================================

import { prisma } from "@/lib/prisma";
import { ImportUrlForm } from "@/components/admin/import-url-form";
import { ImportReviewCard } from "@/components/admin/import-review-card";
import { requireAdmin } from "@/lib/auth-helpers";

export const metadata = {
  title: "استيراد القهوة | BunnList",
};
export const dynamic = "force-dynamic";

export default async function ImportCoffeePage() {
  await requireAdmin();

  // اجلب السجلات التي تحتاج مراجعة (PENDING أو REVIEWED)
  const pending = await prisma.importedCoffee.findMany({
    where: { status: { in: ["PENDING", "REVIEWED"] } },
    include: { importJob: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // كشف الأسماء المكررة داخل الدُفعة الحالية — بدون استعلامات إضافية
  const nameOccurrences = new Map<string, number>();
  for (const item of pending) {
    const key = item.coffeeName?.trim().toLowerCase() ?? "";
    if (key) nameOccurrences.set(key, (nameOccurrences.get(key) ?? 0) + 1);
  }
  const batchDuplicateNames = new Set(
    [...nameOccurrences.entries()]
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800">استيراد القهوة</h1>
      <p className="mt-1 text-sm text-stone-500">
        استورد بيانات منتج قهوة من رابط صفحته، راجِعها، ثم احفظها في قاعدة البيانات.
      </p>

      {/* تنبيه الاستخدام المسؤول */}
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        استورد فقط من مصادر مصرّح لك باستخدامها — موقعكم، أو محامص شريكة وافقت،
        أو مواقع تسمح شروطها بذلك. الأداة تحترم ملف robots.txt ولن تتجاوز أي حجب.
      </div>

      {/* نموذج إدخال الرابط */}
      <section className="mt-6">
        <ImportUrlForm />
      </section>

      {/* قائمة المراجعة */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-stone-800">
          بانتظار المراجعة ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">لا توجد استيرادات معلّقة حالياً.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {pending.map((item) => (
              <ImportReviewCard
                key={item.id}
                imported={JSON.parse(JSON.stringify(item))}
                isBatchDuplicate={batchDuplicateNames.has(
                  item.coffeeName?.trim().toLowerCase() ?? "",
                )}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
