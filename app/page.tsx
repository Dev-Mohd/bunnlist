import { FeatureGrid } from "@/components/FeatureGrid";
import { WaitlistForm } from "@/components/WaitlistForm";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-espresso">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_-10%,rgba(201,164,93,0.22),transparent_34%),linear-gradient(145deg,#140d09_0%,#25150e_46%,#0b0705_100%)]" />
      <div className="bean-pattern absolute inset-0 -z-10 opacity-[0.28]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-l from-transparent via-crema/55 to-transparent" />

      <section className="mx-auto flex min-h-[78vh] w-full max-w-6xl flex-col items-center justify-center px-5 pb-14 pt-8 text-center sm:min-h-[82vh] sm:pt-10">
        <nav className="mb-16 flex w-full items-center justify-center gap-4 text-sm text-oat/68 sm:mb-20">
          <Link
            className="group inline-flex items-center gap-3 text-left font-semibold tracking-[0.18em] text-porcelain"
            href="/"
            aria-label="BunnList"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-crema shadow-[0_0_22px_rgba(201,164,93,0.8)] transition group-hover:scale-125" />
            <span dir="ltr">BunnList</span>
          </Link>
        </nav>

        <div className="max-w-4xl animate-rise">
          <p className="mx-auto mb-5 w-fit rounded-full border border-crema/25 bg-crema/10 px-4 py-2 text-xs font-medium text-crema">
            منصة تقييم محاصيل القهوة المختصة
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.18] tracking-normal text-porcelain sm:text-6xl lg:text-7xl">
            قريبًا... دليلك لاختيار محصول القهوة المناسب
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-oat/78 sm:text-xl" dir="ltr">
            Discover, rate, and brew better coffee crops.
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-8 text-oat/68 sm:text-lg">
            منصة تشاركية تساعدك تعرف وش تشتري، كيف تحضّر، وأي محصول يناسب ذوقك.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#waitlist"
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-porcelain px-7 text-sm font-semibold text-espresso shadow-[0_18px_50px_rgba(255,250,242,0.16)] transition hover:-translate-y-0.5 hover:bg-oat focus:outline-none focus:ring-2 focus:ring-porcelain/80 focus:ring-offset-2 focus:ring-offset-espresso sm:w-auto"
            >
              انضم لقائمة الانتظار
            </a>
          </div>
        </div>
      </section>

      <FeatureGrid />

      <section
        id="waitlist"
        className="mx-auto w-full max-w-4xl px-5 pb-16 text-center sm:pb-20"
        aria-labelledby="waitlist-title"
      >
        <div className="rounded-[8px] border border-white/10 bg-porcelain/[0.055] px-5 py-10 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur sm:px-10">
          <p className="text-sm font-medium text-crema">Early access</p>
          <h2 id="waitlist-title" className="mt-3 text-3xl font-semibold text-porcelain sm:text-4xl">
            كن من أوائل المهتمين
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-oat/64 sm:text-base">
            نسجل اهتمامك الآن، ونرسل لك تحديث الإطلاق لما تكون BunnList جاهزة.
          </p>
          <WaitlistForm />
          <p className="mt-4 hidden text-xs text-oat/58 sm:block">بدون إزعاج. فقط تحديثات الإطلاق.</p>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/10 px-5 py-8 text-sm text-oat/52 sm:flex-row">
        <p dir="ltr">BunnList © 2026</p>
        <p dir="ltr">Built for specialty coffee lovers</p>
      </footer>
    </main>
  );
}
