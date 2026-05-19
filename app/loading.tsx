export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-16 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-72 animate-pulse rounded-lg bg-stone-200" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-lg bg-stone-200" />
          ))}
        </div>
      </div>
    </main>
  );
}
