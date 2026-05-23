export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="h-5 w-36 animate-pulse rounded bg-stone-200" />
        </div>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:pb-12">
          <div className="aspect-square animate-pulse rounded-lg bg-stone-200" />
          <div className="space-y-5">
            <div className="h-7 w-44 animate-pulse rounded-full bg-stone-200" />
            <div className="h-20 animate-pulse rounded bg-stone-200" />
            <div className="h-8 w-72 animate-pulse rounded bg-stone-200" />
            <div className="h-24 animate-pulse rounded-lg bg-stone-200" />
            <div className="h-20 animate-pulse rounded-lg bg-stone-200" />
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-8">
          <div className="h-72 animate-pulse rounded-lg bg-stone-200" />
          <div className="h-36 animate-pulse rounded-lg bg-stone-200" />
          <div className="h-48 animate-pulse rounded-lg bg-stone-200" />
        </div>
        <div className="h-72 animate-pulse rounded-lg bg-stone-200" />
      </div>
    </main>
  );
}
