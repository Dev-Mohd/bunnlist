import Link from "next/link";
import { Coffee, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
      <span className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-amber-100">
        <Coffee className="h-8 w-8 text-amber-700" />
      </span>
      <h1 className="text-6xl font-black text-stone-200">404</h1>
      <h2 className="mt-2 text-2xl font-black text-stone-950">الصفحة غير موجودة</h2>
      <p className="mt-3 max-w-sm text-stone-500">
        يبدو أن هذه الصفحة لا وجود لها. ربما تم نقلها أو حذفها.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-800"
        >
          <Home className="h-4 w-4" />
          العودة للرئيسية
        </Link>
        <Link
          href="/coffees"
          className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
        >
          <Search className="h-4 w-4" />
          استكشف المحاصيل
        </Link>
      </div>
    </div>
  );
}
