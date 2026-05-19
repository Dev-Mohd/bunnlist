export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 space-y-2">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-200" />
        ))}
      </div>
      <div className="mt-8 h-40 animate-pulse rounded-2xl bg-stone-200" />
    </div>
  );
}
