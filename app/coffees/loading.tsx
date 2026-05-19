export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-36 animate-pulse rounded-lg bg-stone-200" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="hidden h-[720px] animate-pulse rounded-lg bg-stone-200 lg:block" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-lg bg-stone-200" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
