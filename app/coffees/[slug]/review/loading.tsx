export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="h-16 border-b border-stone-200 bg-stone-50" />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="h-6 w-40 animate-pulse rounded bg-stone-200" />
        <div className="mt-4 h-10 w-2/3 animate-pulse rounded-lg bg-stone-200" />
        <div className="mt-8 space-y-6">
          <div className="h-24 animate-pulse rounded-xl bg-stone-200" />
          <div className="h-32 animate-pulse rounded-xl bg-stone-200" />
          <div className="h-28 animate-pulse rounded-xl bg-stone-200" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-stone-200" />
        </div>
      </div>
    </div>
  );
}
