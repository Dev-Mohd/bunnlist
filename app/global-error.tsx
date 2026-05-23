"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

// يعترض الأخطاء التي تحدث داخل app/layout.tsx نفسه (مثل فشل auth في SiteHeader)
// يجب أن يتضمن <html> و <body> لأنه يحلّ محل الـ root layout عند الخطأ
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-stone-50">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <span className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </span>
          <h1 className="text-2xl font-black text-stone-950">حدث خطأ غير متوقع</h1>
          <p className="mt-3 max-w-sm text-stone-500">
            نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية.
          </p>
          {error.digest ? (
            <p className="mt-2 text-xs text-stone-400" dir="ltr">
              ref: {error.digest}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-800"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
            >
              <Home className="h-4 w-4" />
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
