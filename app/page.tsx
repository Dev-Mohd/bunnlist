import { FeatureGrid } from "@/components/FeatureGrid";
import { SocialLinks } from "@/components/SocialLinks";
import { WaitlistForm } from "@/components/WaitlistForm";
import Link from "next/link";

const helpSteps = [
  {
    title: "ابحث عن المحصول",
    text: "ابحث باسم المحصول، المحمصة، الدولة، المعالجة، أو طريقة التحضير.",
  },
  {
    title: "اقرأ تجارب الناس",
    text: "شوف تقييمات المستخدمين، ملاحظاتهم، والنكهات اللي ظهرت معهم.",
  },
  {
    title: "اعرف أفضل طريقة تحضير",
    text: "هل يناسب V60؟ Espresso؟ Chemex؟ المجتمع يساعدك تعرف.",
  },
  {
    title: "قرر قبل الشراء",
    text: "خذ قرارك بناءً على تجارب حقيقية، مو وصف المنتج فقط.",
  },
];

const problemChips = [
  "هل يناسب V60 أو Espresso؟",
  "هل النكهات المكتوبة فعلًا واضحة؟",
  "هل يستاهل السعر؟",
];

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-espresso text-porcelain">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_-10%,rgba(201,164,93,0.22),transparent_34%),linear-gradient(145deg,#140d09_0%,#25150e_46%,#0b0705_100%)]" />
      <div className="bean-pattern absolute inset-0 -z-10 opacity-[0.22]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-l from-transparent via-crema/55 to-transparent" />

      <section className="mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col items-center justify-center px-5 pb-16 pt-8 text-center sm:pt-10">
        <nav className="mb-14 flex w-full items-center justify-center text-sm text-oat/68 sm:mb-20">
          <Link
            className="group inline-flex items-center gap-3 text-left font-semibold tracking-[0.18em] text-porcelain"
            href="/"
            aria-label="BunnList"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-crema shadow-[0_0_22px_rgba(201,164,93,0.8)] transition group-hover:scale-125" />
            <span dir="ltr">BunnList</span>
          </Link>
        </nav>

        <div className="max-w-5xl animate-rise">
          <p className="mx-auto mb-5 w-fit rounded-full border border-crema/25 bg-crema/10 px-4 py-2 text-xs font-medium text-crema">
            منصة مجتمعية لتقييم محاصيل القهوة المختصة
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.18] tracking-normal text-porcelain sm:text-6xl lg:text-7xl">
            قبل لا تشتري محصولك الجاي، شوف تجارب الناس فيه
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-pretty text-base leading-8 text-oat/74 sm:text-xl sm:leading-10">
            BunnList منصة تشاركية لتقييم محاصيل القهوة المختصة. تساعدك تعرف هل المحصول يستاهل، وش قالوا الناس عنه،
            وأفضل طريقة لتحضيره سواء V60 أو Espresso أو Chemex.
          </p>
          <p className="mx-auto mt-5 w-fit rounded-full border border-crema/25 bg-[#21140d]/78 px-5 py-2 text-sm font-semibold text-crema shadow-glow">
            الفكرة ببساطة: IMDb لمحاصيل القهوة.
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-7 text-oat/62 sm:text-base">
            BunnList ليس متجرًا لبيع القهوة، بل مرجع مجتمعي يساعدك تختار بثقة.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3">
            <a
              href="#waitlist"
              className="inline-flex min-h-14 w-full max-w-md items-center justify-center rounded-full bg-porcelain px-7 text-sm font-semibold text-espresso shadow-[0_18px_50px_rgba(255,250,242,0.16)] transition hover:-translate-y-0.5 hover:bg-oat focus:outline-none focus:ring-2 focus:ring-porcelain/80 focus:ring-offset-2 focus:ring-offset-espresso sm:w-auto sm:max-w-none"
            >
              انضم لأول مجتمع عربي لتقييم محاصيل القهوة
            </a>
            <span className="text-sm text-oat/56">دخول مبكر للنسخة التجريبية عند الإطلاق.</span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-16" aria-labelledby="how-it-helps">
        <div className="mb-7 text-center">
          <h2 id="how-it-helps" className="text-3xl font-semibold text-porcelain sm:text-4xl">
            كيف يساعدك BunnList؟
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {helpSteps.map((step, index) => (
            <article
              className="rounded-[8px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-crema/40 hover:bg-white/[0.075]"
              key={step.title}
            >
              <span className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-crema/30 bg-crema/10 text-sm font-semibold text-crema">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold text-porcelain">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-oat/66">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 pb-16" aria-labelledby="problem-title">
        <div className="rounded-[8px] border border-crema/20 bg-[#21140d]/72 px-5 py-9 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur sm:px-8 sm:py-10">
          <h2 id="problem-title" className="text-3xl font-semibold text-porcelain sm:text-4xl">
            وصف المحصول وحده ما يكفي
          </h2>
          <p className="mt-5 text-pretty text-base leading-8 text-oat/70 sm:text-lg sm:leading-9">
            كثير من المحاصيل توصف بنكهات مثل فراولة، عسل، ورد، أو شوكولاتة. لكن التجربة الفعلية تختلف حسب
            التحضير، الطحنة، الماء، والمحمصة. BunnList يجمع تجارب الناس عشان تعرف هل المحصول يستاهل فعلًا قبل
            لا تشتريه.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {problemChips.map((chip) => (
              <span
                className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-medium text-oat/78"
                key={chip}
              >
                {chip}
              </span>
            ))}
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
            كن من أوائل من يجرّب BunnList
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-oat/64 sm:text-base">
            سجّل الآن لتحصل على دخول مبكر للنسخة التجريبية، وتساهم في بناء أول مرجع عربي لتقييم محاصيل القهوة
            المختصة.
          </p>
          <WaitlistForm />
          <p className="mx-auto mt-4 max-w-xl text-xs leading-6 text-oat/56">
            أول المستخدمين بيكون لهم دور في ترشيح المحامص والمحاصيل قبل الإطلاق.
          </p>
        </div>
      </section>

      <SocialLinks />

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/10 px-5 py-8 text-sm text-oat/52 sm:flex-row">
        <p dir="ltr">BunnList © 2026</p>
        <p dir="ltr">Built for specialty coffee lovers in Saudi Arabia and the Gulf.</p>
      </footer>
    </main>
  );
}
