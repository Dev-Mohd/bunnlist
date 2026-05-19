export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="h-16 border-b border-stone-200 bg-stone-50" />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-stone-200" />
          <div className="h-5 w-24 animate-pulse rounded bg-stone-200" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-5">
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-stone-200" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-2/3 animate-pulse rounded bg-stone-200" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200" />
                <div className="flex gap-2">
                  <div className="h-6 w-24 animate-pulse rounded-full bg-stone-200" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-stone-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
