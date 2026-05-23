// components/admin/import-url-form.tsx
// ============================================================
//  نموذج إدخال رابط المنتج لبدء عملية الاستيراد.
// ============================================================

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startImport } from "@/actions/import";

export function ImportUrlForm() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError("الرجاء إدخال رابط.");
      return;
    }
    startTransition(async () => {
      const res = await startImport(trimmed);
      if (res.ok) {
        setUrl("");
        router.refresh(); // يحدّث قائمة المراجعة
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <label htmlFor="import-url" className="block text-sm font-medium text-stone-700">
        رابط صفحة المنتج
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="import-url"
          type="url"
          dir="ltr"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/products/coffee"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm
                     text-stone-800 focus:border-amber-600 focus:outline-none focus:ring-1
                     focus:ring-amber-600"
          disabled={isPending}
        />
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white
                     hover:bg-amber-800 disabled:opacity-50"
        >
          {isPending ? "جارٍ الاستيراد..." : "استيراد"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      <p className="mt-2 text-xs text-stone-400">
        سنجلب الصفحة، نستخرج البيانات، ونعرضها لك للمراجعة قبل الحفظ.
      </p>
    </div>
  );
}
