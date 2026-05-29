const brewMethods = ["V60", "Espresso", "Chemex"];

export function HeroRatingCard() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="rounded-[28px] border border-[#4A3428]/12 bg-white p-4 shadow-[0_28px_80px_rgba(74,52,40,0.18)]">
        <div className="rounded-3xl bg-[#171411] p-4 text-[#EDE3D6]">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D6A84F]" />
              Top Rated
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D6A84F]/70 px-3 py-1.5 text-xs font-bold text-[#D6A84F]">
              #1 اختيار المجتمع
            </span>
          </div>
          <div className="mt-16 h-20 rounded-2xl bg-[linear-gradient(135deg,rgba(109,123,97,0.82),rgba(74,52,40,0.9)),radial-gradient(circle_at_20%_20%,rgba(237,227,214,0.18),transparent_26%)]" />
        </div>

        <div className="-mt-8 rounded-[24px] border border-[#4A3428]/10 bg-[#fffaf3] p-5 shadow-[0_18px_42px_rgba(74,52,40,0.14)]">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black text-[#6D7B61]">إثيوبيا</p>
              <h3 className="mt-1 text-2xl font-black leading-8 text-[#171411]">Yirgacheffe Kochere</h3>
              <p className="mt-1 text-sm font-semibold text-[#4A3428]/75">Natural · Heirloom</p>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2" dir="ltr">
                <span className="text-5xl font-black tracking-normal text-[#171411]">4.7</span>
                <span className="h-4 w-4 rounded-full bg-[#D6A84F]" />
              </div>
              <p className="mt-1 text-xs font-bold text-[#4A3428]/65">تقييم المجتمع</p>
              <p className="text-xs font-bold text-[#4A3428]/65">128 تقييم</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {brewMethods.map((method) => (
              <span className="rounded-full border border-[#6D7B61]/30 bg-[#6D7B61]/10 px-3 py-1 text-xs font-black text-[#4A3428]" key={method}>
                {method}
              </span>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="الترتيب" value="#1" accent />
            <Metric label="نسبة الترشيح" value="92%" accent />
            <Metric label="مقارنة" value="+18%" />
          </div>

          <div className="mt-5 space-y-3">
            <Bar label="الحلاوة" active={4} />
            <Bar label="القوام" active={3} brown />
            <Bar label="الحموضة" active={3} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#4A3428]/10 bg-white px-3 py-3 text-center">
      <p className="text-xs font-bold text-[#4A3428]/62">{label}</p>
      <p className={accent ? "mt-1 text-2xl font-black text-[#D6A84F]" : "mt-1 text-2xl font-black text-[#171411]"}>
        {value}
      </p>
    </div>
  );
}

function Bar({ label, active, brown = false }: { label: string; active: number; brown?: boolean }) {
  return (
    <div className="grid grid-cols-[72px_1fr] items-center gap-3">
      <span className="text-xs font-bold text-[#4A3428]/70">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            className={
              index < active
                ? brown
                  ? "h-2 flex-1 rounded-full bg-[#4A3428]"
                  : "h-2 flex-1 rounded-full bg-[#6D7B61]"
                : "h-2 flex-1 rounded-full bg-[#EDE3D6]"
            }
            key={index}
          />
        ))}
      </div>
    </div>
  );
}
