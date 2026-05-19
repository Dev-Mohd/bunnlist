export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-[4/3] animate-pulse rounded-lg bg-stone-200" />
          <div className="space-y-4">
            <div className="h-10 animate-pulse rounded bg-stone-200" />
            <div className="h-20 animate-pulse rounded bg-stone-200" />
            <div className="h-32 animate-pulse rounded bg-stone-200" />
          </div>
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-stone-200" />
      </div>
    </main>
  );
}
