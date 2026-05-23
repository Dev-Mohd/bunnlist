// Skeleton يطابق layout صفحة تفاصيل المحصول لتقليل layout shift
export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50">

      {/* ── Hero skeleton ── */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-12">

          {/* صورة */}
          <div className="aspect-[4/3] animate-pulse rounded-xl bg-stone-200" />

          {/* معلومات */}
          <div className="flex flex-col justify-center gap-5">
            {/* العنوان */}
            <div className="space-y-2">
              <div className="h-10 w-3/4 animate-pulse rounded-lg bg-stone-200" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-stone-200" />
            </div>
            {/* التقييم */}
            <div className="h-6 w-40 animate-pulse rounded bg-stone-200" />
            {/* أفضل طريقة تحضير */}
            <div className="h-20 animate-pulse rounded-xl bg-stone-200" />
            {/* زر التقييم */}
            <div className="h-11 w-36 animate-pulse rounded-lg bg-stone-200" />
          </div>
        </div>
      </section>

      {/* ── Body skeleton ── */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">

        {/* العمود الرئيسي */}
        <div className="space-y-8">
          {/* معلومات المحصول */}
          <div className="space-y-3">
            <div className="h-7 w-40 animate-pulse rounded bg-stone-200" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-stone-200" />
              ))}
            </div>
          </div>
          {/* التقييمات */}
          <div className="space-y-4">
            <div className="h-7 w-48 animate-pulse rounded bg-stone-200" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg bg-stone-200" />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="h-72 animate-pulse rounded-lg bg-stone-200 lg:sticky lg:top-24 lg:self-start" />
      </div>
    </main>
  );
}
