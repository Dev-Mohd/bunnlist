export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div className="space-y-3">
              <div className="h-7 w-32 animate-pulse rounded-full bg-stone-200" />
              <div className="h-10 w-64 animate-pulse rounded bg-stone-200" />
              <div className="h-16 max-w-2xl animate-pulse rounded bg-stone-200" />
            </div>
            <div className="h-28 animate-pulse rounded-lg bg-stone-200" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="hidden h-[720px] animate-pulse rounded-lg bg-stone-200 lg:block" />
          <div className="space-y-5">
            <div className="h-28 animate-pulse rounded-lg bg-stone-200 sm:h-20" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="h-[430px] animate-pulse rounded-lg bg-stone-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
