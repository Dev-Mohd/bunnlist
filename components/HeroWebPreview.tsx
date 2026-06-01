import { BunnListLogo } from "@/components/Logo";

const filters = ["V60", "Espresso", "Chemex", "إثيوبيا", "مجفف طبيعي"];

const lots = [
  {
    rank: "#1",
    name: "إثيوبيا يرغاشيف كوتشيري",
    rating: "4.7",
    reviews: "128 تقييم",
    method: "V60",
  },
  {
    rank: "#2",
    name: "كولومبيا هويلا",
    rating: "4.6",
    reviews: "97 تقييم",
    method: "Espresso",
  },
  {
    rank: "#3",
    name: "كينيا كيرينياغا",
    rating: "4.5",
    reviews: "84 تقييم",
    method: "Chemex",
  },
];

export function HeroWebPreview() {
  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-[26px] border border-[#4A3428]/12 bg-[#fffaf3] shadow-[0_28px_80px_rgba(74,52,40,0.18)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#4A3428]/10 bg-white/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#D6A84F]" />
            <span className="h-3 w-3 rounded-full bg-[#6D7B61]" />
            <span className="h-3 w-3 rounded-full bg-[#4A3428]" />
          </div>
          <BunnListLogo className="[&>svg]:h-8 [&>svg]:w-8 [&>span]:text-lg" />
        </div>

        <div className="p-4 sm:p-5">
          <div className="rounded-2xl border border-[#4A3428]/10 bg-white px-4 py-3 text-sm font-bold text-[#4A3428]/55">
            ابحث عن محصول، محمصة، دولة...
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {filters.map((filter, index) => (
              <span
                className={
                  index === 0
                    ? "rounded-full border border-[#D6A84F]/50 bg-[#D6A84F]/15 px-3 py-1.5 text-xs font-black text-[#171411]"
                    : "rounded-full border border-[#4A3428]/10 bg-[#EDE3D6]/65 px-3 py-1.5 text-xs font-bold text-[#4A3428]"
                }
                key={filter}
              >
                {filter}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#6D7B61]">تقييم المجتمع</p>
              <h2 className="mt-1 text-xl font-black text-[#171411]">الأعلى تقييمًا</h2>
            </div>
            <span className="rounded-full border border-[#D6A84F]/60 px-3 py-1.5 text-xs font-black text-[#4A3428]">
              اختيار المجتمع
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {lots.map((lot) => (
              <article
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-[#4A3428]/10 bg-white/75 p-3"
                key={lot.rank}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#171411] text-sm font-black text-[#D6A84F]">
                  {lot.rank}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-[#171411]">{lot.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-[#4A3428]/60">
                    <span>{lot.reviews}</span>
                    <span className="h-1 w-1 rounded-full bg-[#D6A84F]" />
                    <span>{lot.method}</span>
                    <span className="text-[#6D7B61]">أعلى من المتوسط</span>
                  </div>
                </div>
                <div className="flex items-center gap-2" dir="ltr">
                  <span className="text-2xl font-black text-[#171411]">{lot.rating}</span>
                  <span className="h-3 w-3 rounded-full bg-[#D6A84F]" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
