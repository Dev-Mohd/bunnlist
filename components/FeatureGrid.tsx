const features = [
  {
    title: "تجربة المجتمع",
    description: "آراء وتجارب من محبي القهوة تساعدك تفهم جودة المحصول قبل الشراء.",
  },
  {
    title: "طريقة التحضير الأنسب",
    description: "اعرف هل المحصول يطلع أفضل مع V60 أو Espresso أو Chemex أو غيرها.",
  },
  {
    title: "وضوح النكهات",
    description: "هل النكهات المكتوبة ظهرت فعلًا في تجارب الناس؟",
  },
  {
    title: "الترتيب والترشيح",
    description: "شوف المحاصيل الأعلى تقييمًا والأكثر ترشيحًا حسب المجتمع.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-11 sm:px-6 lg:px-8" aria-labelledby="features-title">
      <div className="mb-6">
        <p className="text-sm font-black text-[#6D7B61]">معايير التقييم</p>
        <h2 id="features-title" className="mt-2 text-3xl font-black text-[#171411] sm:text-4xl">
          وش يهمنا في تقييم المحصول؟
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <article
            className="rounded-[8px] border border-[#4A3428]/10 bg-white/55 p-5 shadow-[0_18px_48px_rgba(74,52,40,0.08)] transition duration-200 hover:-translate-y-1 hover:border-[#6D7B61]/35"
            key={feature.title}
          >
            <span className="mb-5 block h-1.5 w-10 rounded-full bg-[#6D7B61]" />
            <h3 className="text-lg font-black text-[#171411]">{feature.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#4A3428]/72">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
