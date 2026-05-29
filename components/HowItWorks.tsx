const steps = [
  {
    title: "اكتشف",
    text: "ابحث عن محاصيل القهوة حسب المحمصة، الدولة، المعالجة، النكهات، أو طريقة التحضير.",
    icon: "⌕",
  },
  {
    title: "قيّم",
    text: "اقرأ تقييمات الناس، وشوف متوسط التقييم وعدد التجارب.",
    icon: "★",
  },
  {
    title: "قارن",
    text: "قارن بين المحاصيل حسب التقييم، النكهات، طريقة التحضير، وتجارب المجتمع.",
    icon: "≋",
  },
  {
    title: "اختر بثقة",
    text: "قرر وش تشتري بناءً على تجارب حقيقية، مو وصف تسويقي فقط.",
    icon: "✓",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8" aria-labelledby="how-title">
      <div className="mb-8">
        <p className="text-sm font-black text-[#6D7B61]">Product flow</p>
        <h2 id="how-title" className="mt-2 text-3xl font-black text-[#171411] sm:text-4xl">
          كيف يساعدك BunnList؟
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <article
            className="rounded-[8px] border border-[#4A3428]/10 bg-white/55 p-5 shadow-[0_18px_48px_rgba(74,52,40,0.08)]"
            key={step.title}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#6D7B61]/14 text-2xl font-black text-[#171411]">
                {step.icon}
              </span>
              <span className="text-xs font-black text-[#4A3428]/40">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="mt-5 text-xl font-black text-[#171411]">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#4A3428]/72">{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
