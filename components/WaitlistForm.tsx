export function WaitlistForm() {
  return (
    <form
      className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.07] p-2 shadow-glow backdrop-blur sm:flex-row"
      aria-label="BunnList waitlist form"
    >
      <label className="sr-only" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        className="min-h-14 flex-1 rounded-3xl border border-transparent bg-white/10 px-5 text-left text-base text-porcelain outline-none transition placeholder:text-porcelain/45 focus:border-crema/60 focus:bg-white/[0.13]"
      />
      <button
        type="button"
        className="min-h-14 rounded-3xl bg-crema px-6 text-sm font-semibold text-espresso transition hover:-translate-y-0.5 hover:bg-[#d7b775] focus:outline-none focus:ring-2 focus:ring-crema/70 focus:ring-offset-2 focus:ring-offset-espresso"
      >
        أبلغني عند الإطلاق
      </button>
      <p className="px-3 pb-2 text-center text-xs text-oat/58 sm:hidden">
        بدون إزعاج. فقط تحديثات الإطلاق.
      </p>
    </form>
  );
}
