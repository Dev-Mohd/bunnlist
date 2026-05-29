import Link from "next/link";
import { ImageUpload } from "@/components/ui/image-upload";
import { requireAdmin } from "@/lib/auth-helpers";

export const metadata = { title: "اختبار رفع الصور — BunnList" };
export const dynamic = "force-dynamic";

export default async function ImageUploadTestPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin" className="text-sm font-bold text-amber-800 hover:text-amber-900">
            العودة للوحة الإدارة
          </Link>
          <h1 className="mt-4 text-2xl font-black text-stone-950">اختبار رفع صور المحاصيل</h1>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            صفحة مؤقتة للتأكد من رفع الصور إلى مساحة تخزين BunnList وعرضها بالرابط العام.
          </p>
        </div>

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <ImageUpload />
        </section>
      </div>
    </main>
  );
}
