const features = [
  {
    title: "تقييمات المجتمع",
    description: "آراء موثوقة من مجتمع القهوة المختصة تساعدك تختار بثقة.",
  },
  {
    title: "أفضل طريقة تحضير لكل محصول",
    description: "اقتراحات V60، Espresso، Chemex، و Aeropress حسب شخصية المحصول.",
  },
  {
    title: "بحث ذكي ومفصل",
    description: "صف النتائج حسب المحمصة، الدولة، المعالجة، والنكهات.",
  },
  {
    title: "قوائم لأفضل المحاصيل",
    description: "اكتشف المحاصيل الأعلى تقييمًا وما يستحق التجربة أولًا.",
  },
];

export function FeatureGrid() {
  return (
    <section
      className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="BunnList feature highlights"
    >
      {features.map((feature, index) => (
        <article
          className="group rounded-[8px] border border-coffee/55 bg-[#21140d]/72 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-crema/45 hover:bg-[#27180f]/88"
          key={feature.title}
          style={{ animationDelay: `${180 + index * 90}ms` }}
        >
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-crema/30 bg-crema/10 text-sm font-semibold text-crema">
            {String(index + 1).padStart(2, "0")}
          </div>
          <h2 className="text-lg font-semibold text-porcelain">{feature.title}</h2>
          <p className="mt-3 text-sm leading-7 text-oat/66">{feature.description}</p>
        </article>
      ))}
    </section>
  );
}
