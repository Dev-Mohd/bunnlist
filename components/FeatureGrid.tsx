const features = [
  {
    title: "تقييمات المجتمع",
    description: "آراء وتجارب من محبي القهوة تساعدك تعرف جودة المحصول قبل الشراء.",
  },
  {
    title: "أفضل طريقة تحضير",
    description: "اعرف هل المحصول يطلع أفضل مع V60 أو Espresso أو Chemex أو غيرها.",
  },
  {
    title: "اكتشاف ذكي",
    description: "ابحث حسب المحمصة، الدولة، المعالجة، النكهات، أو طريقة التحضير.",
  },
  {
    title: "مقارنة وترتيب",
    description: "شوف المحاصيل الأعلى تقييمًا، الأكثر ترشيحًا، والأفضل حسب المجتمع.",
  },
];

export function FeatureGrid() {
  return (
    <section
      className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-5 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8"
      aria-label="BunnList feature highlights"
    >
      {features.map((feature, index) => (
        <article
          className="rounded-[8px] border border-[#4A3428]/10 bg-white/55 p-5 shadow-[0_18px_48px_rgba(74,52,40,0.08)] transition duration-200 hover:-translate-y-1 hover:border-[#6D7B61]/35"
          key={feature.title}
          style={{ animationDelay: `${180 + index * 90}ms` }}
        >
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4A3428] text-sm font-black text-[#EDE3D6]">
            {String(index + 1).padStart(2, "0")}
          </div>
          <h2 className="text-lg font-black text-[#171411]">{feature.title}</h2>
          <p className="mt-3 text-sm leading-7 text-[#4A3428]/72">{feature.description}</p>
        </article>
      ))}
    </section>
  );
}
