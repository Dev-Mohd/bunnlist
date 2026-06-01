import type { ReactNode } from "react";

const steps = [
  {
    title: "اكتشف",
    text: "ابحث عن محاصيل القهوة حسب المحمصة، الدولة، المعالجة، النكهات، أو طريقة التحضير.",
    icon: SearchIcon,
  },
  {
    title: "قيّم",
    text: "اقرأ تقييمات الناس، وشوف متوسط التقييم وعدد التجارب.",
    icon: RatingIcon,
  },
  {
    title: "قارن",
    text: "قارن بين المحاصيل حسب التقييم، النكهات، طريقة التحضير، وتجارب المجتمع.",
    icon: CompareIcon,
  },
  {
    title: "اختر بثقة",
    text: "قرر وش تشتري بناءً على تجارب حقيقية، مو وصف تسويقي فقط.",
    icon: CheckIcon,
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-11 sm:px-6 lg:px-8" aria-labelledby="how-title">
      <div className="mb-6">
        <p className="text-sm font-black text-[#6D7B61]">طريقة عمل المنصة</p>
        <h2 id="how-title" className="mt-2 text-3xl font-black text-[#171411] sm:text-4xl">
          كيف يساعدك BunnList؟
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <article
              className="rounded-[8px] border border-[#4A3428]/10 bg-white/55 p-5 shadow-[0_18px_48px_rgba(74,52,40,0.08)]"
              key={step.title}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon />
                <span className="text-xs font-black text-[#4A3428]/40">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-5 text-xl font-black text-[#171411]">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#4A3428]/72">{step.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#6D7B61]/14 text-[#171411]">
      {children}
    </span>
  );
}

function SearchIcon() {
  return (
    <IconFrame>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
        <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function RatingIcon() {
  return (
    <IconFrame>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 19V9M12 19V5M17 19v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function CompareIcon() {
  return (
    <IconFrame>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 6h12M5 12h12M7 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function CheckIcon() {
  return (
    <IconFrame>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12.5l4.2 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconFrame>
  );
}
