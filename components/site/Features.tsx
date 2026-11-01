"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PhoneFrame } from "./Chrome";
import { useInView } from "./Motion";
import { LAND_DOTS, MAP_PROJ } from "@/lib/site-map";

// The newer parts of the app, each with a small animated scene: the advisor
// («ساعدني أختار»), today's coffee and «لك», the producing-countries map and
// passport, the community and «قوائمي». Bags here are drawn, never a roaster's
// packaging: the site promotes the app, not any brand.

const FAM: Record<string, string> = {
  berry: "#B83345", citrus: "#F2BD33", stone: "#ED945C", floral: "#C28FDB", choc: "#5C3826",
  caramel: "#C78540", nutty: "#A3784D", honey: "#E3B040", tea: "#85A854", dried: "#8C454D",
};

/** A plain stand-up pouch with only the origin on it. */
export function DrawnBag({ color, origin, width = 120 }: { color: string; origin: string; width?: number }) {
  return (
    <svg width={width} height={width * 1.35} viewBox="0 0 150 203" aria-hidden="true">
      <defs>
        <linearGradient id={`sh-${origin}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".18" /><stop offset=".35" stopColor="#fff" stopOpacity=".14" />
          <stop offset=".7" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
      </defs>
      <path d="M18 14 H132 L138 190 Q75 200 12 190 Z" fill={color} />
      <rect x="18" y="8" width="114" height="16" rx="3" fill={color} style={{ filter: "brightness(.8)" }} />
      <path d="M18 14 H132 L138 190 Q75 200 12 190 Z" fill={`url(#sh-${origin})`} />
      <rect x="34" y="78" width="82" height="70" rx="10" fill="#F7F1E8" />
      <ellipse cx="75" cy="100" rx="9" ry="12" fill="#4A3428" />
      <path d="M75 89 Q70 100 75 111" stroke="#F7F1E8" strokeWidth="2" fill="none" />
      <text x="75" y="134" textAnchor="middle" fontWeight="700" fontSize="15" fill="#171411" fontFamily="inherit">{origin}</text>
    </svg>
  );
}

function Ring({ value, play, size = 84, stroke = 8, color = "var(--accent)" }: { value: number; play: boolean; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={play ? c * (1 - value / 100) : c} style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-bold" style={{ color, fontSize: size * 0.24 }} dir="ltr">{value}%</span>
    </div>
  );
}

/** Text on one side, the scene on the other; `flip` swaps sides on wide screens. */
function Split({ id, kicker, title, body, children, flip = false, dark = false, alt = false }: {
  id?: string; kicker: string; title: string; body: ReactNode; children: ReactNode; flip?: boolean; dark?: boolean; alt?: boolean;
}) {
  const [ref, shown] = useInView<HTMLDivElement>(0.25);
  return (
    <section id={id} className={`scroll-mt-12 overflow-hidden px-5 py-20 sm:py-28 ${dark ? "bg-[var(--dark)] text-[var(--bg)]" : alt ? "bg-[var(--bg-alt)]" : "bg-[var(--bg)]"}`}>
      <div ref={ref} data-shown={shown} className={`reveal mx-auto grid max-w-[1024px] items-center gap-12 lg:grid-cols-2 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div className="text-center lg:text-start">
          <p className={`text-[17px] font-semibold ${dark ? "text-[var(--gold-light)]" : "text-[var(--accent)]"}`}>{kicker}</p>
          <h2 className="mt-2 text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[48px]">{title}</h2>
          <div className={`mx-auto mt-5 max-w-[38ch] text-[19px] leading-relaxed lg:mx-0 ${dark ? "text-[var(--dark-ink-2)]" : "text-[var(--ink-2)]"}`}>{body}</div>
        </div>
        <div className="flex justify-center">{children}</div>
      </div>
    </section>
  );
}

function useLoop(steps: number, ms: number, run: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setI(steps - 1); return; }
    const t = setInterval(() => setI((x) => (x + 1) % steps), ms);
    return () => clearInterval(t);
  }, [steps, ms, run]);
  return i;
}

// MARK: «ساعدني أختار»

const MOODS = [["☀️", "أبي أصحصح"], ["🛋️", "روقان"], ["👥", "عندي ضيوف"], ["🧭", "شي جديد"]];
const PICKS = [
  { color: "#2f3b5c", origin: "إثيوبيا", name: "إثيوبيا: قوجي", why: "توت وياسمين، بدون مرارة", score: 94 },
  { color: "#b5654a", origin: "رواندا", name: "رواندا: نياماشيكي", why: "خوخ وشاي، منعشة على الثلج", score: 89 },
  { color: "#3f6e6a", origin: "كولومبيا", name: "كولومبيا: أنيروبك", why: "فراولة وكرز، تجربة جديدة", score: 85 },
];

function AdvisorPhone() {
  // 0 mood, 1 mood picked, 2 flavours, 3 hot/iced, 4 thinking, 5 results
  const [ref, shown] = useInView<HTMLDivElement>(0.3);
  const step = useLoop(8, 1500, shown);
  const s = Math.min(step, 5);
  return (
    <div ref={ref}>
    <PhoneFrame>
      <div className="absolute inset-0 bg-[var(--bg)] px-4 pt-12 text-[var(--ink)]">
        {s <= 1 && (
          <div key="mood" className="scene-in">
            <Bar n={1} />
            <p className="mt-4 text-[22px] font-bold">وش جوّك اليوم؟</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {MOODS.map(([e, t], i) => (
                <div key={t} className={`rounded-[18px] bg-[var(--card)] py-4 text-center transition-all duration-300 ${s === 1 && i === 1 ? "scale-105 ring-2 ring-[var(--accent)]" : ""}`}>
                  <div className="text-[30px]">{e}</div><div className="mt-1 text-[14px] font-bold">{t}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {s === 2 && (
          <div key="fl" className="scene-in">
            <Bar n={3} />
            <p className="mt-4 text-[22px] font-bold">وش يشدّك في الطعم؟</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[["توت", "berry", true], ["شوكولاتة", "choc", false], ["زهري", "floral", true], ["حمضيات", "citrus", false], ["كراميل", "caramel", false], ["عسل", "honey", false]].map(([t, f, on]) => (
                <span key={t as string} className="rounded-full px-3.5 py-2 text-[14px] font-bold transition-all"
                  style={on ? { background: FAM[f as string], color: "#fff", transform: "scale(1.06)" } : { background: "var(--card)" }}>{t as string}</span>
              ))}
            </div>
          </div>
        )}
        {s === 3 && (
          <div key="sv" className="scene-in">
            <Bar n={4} />
            <p className="mt-4 text-[22px] font-bold">حار ولا بارد؟</p>
            <div className="mt-4 flex h-[260px] gap-2.5">
              <div className="flex flex-1 scale-95 flex-col items-center justify-center rounded-[22px] bg-gradient-to-b from-[#f6d7b8] to-[#e9a86e] opacity-40"><span className="text-[46px]">☕</span><b>حار</b></div>
              <div className="flex flex-1 scale-105 flex-col items-center justify-center rounded-[22px] bg-gradient-to-b from-[#dcecf2] to-[#9cc7d9] shadow-lg"><span className="text-[46px]">🧊</span><b>بارد</b></div>
            </div>
          </div>
        )}
        {s === 4 && (
          <div key="th" className="scene-in flex h-[80%] flex-col items-center justify-center">
            <div className="spin relative h-[120px] w-[120px]">
              {[0, 72, 144, 216, 288].map((d) => (
                <span key={d} className="absolute left-[50px] top-0 h-[24px] w-[18px] rounded-full bg-[var(--brown,#4A3428)]" style={{ transform: `rotate(${d}deg)`, transformOrigin: "9px 60px" }} />
              ))}
            </div>
            <p className="mt-6 text-[17px] font-bold">نختار لك…</p>
          </div>
        )}
        {s === 5 && (
          <div key="rs" className="scene-in">
            <p className="text-center text-[13px] font-bold text-[var(--gold)]">✨ قهوتك اليوم</p>
            <p className="text-center text-[20px] font-bold">لقينا لك ٣ تناسبك</p>
            <div className="mt-3 space-y-2.5">
              {PICKS.map((p, i) => (
                <div key={p.name} className={`flex items-center gap-2.5 rounded-[18px] bg-[var(--card)] p-2.5 ${i === 0 ? "ring-2 ring-[var(--gold)]" : ""}`}
                  style={{ animation: `rise .6s cubic-bezier(.2,.9,.3,1.2) ${i * 0.15}s both` }}>
                  <DrawnBag color={p.color} origin={p.origin} width={40} />
                  <div className="min-w-0 flex-1"><b className="block truncate text-[13px]">{p.name}</b><span className="text-[11px] text-[var(--accent)]">{p.why}</span></div>
                  <Ring value={p.score} play size={48} stroke={5} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
    </div>
  );
}

function Bar({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${n * 20}%` }} /></div>
      <span className="text-[11px] text-[var(--ink-2)]">{n} من ٥</span>
    </div>
  );
}

export function AdvisorSection() {
  return (
    <Split id="advisor" kicker="✨ جديد" title="ما تدري وش تشرب؟ نختار لك."
      body={<>جاوب كم سؤال: وش جوّك، وش بتستخدم، وش يشدّك في الطعم، حار ولا بارد. وتقدر تكتب اللي في بالك بكلامك. ونطلع لك ثلاث قهاوي تناسبك، ونقول لك ليش.</>}>
      <AdvisorPhone />
    </Split>
  );
}

// MARK: Today's coffee and «لك»

export function DailySection() {
  const [ref, shown] = useInView<HTMLDivElement>(0.4);
  return (
    <Split kicker="قهوة اليوم" title="كل يوم، قهوة على ذوقك." flip alt
      body={<>من أول ما تسجّل تقول لنا وش تحب، ونرتّب لك القهاوي على ذوقك وتتجدد كل يوم. وكل ما قيّمت أكثر، صارت «قهوة اليوم» أدق.</>}>
      <div ref={ref} className="relative flex h-[440px] w-full max-w-[420px] items-center justify-center">
        <div className="float"><DrawnBag color="#2f3b5c" origin="إثيوبيا" width={170} /></div>
        {[["توت أزرق", "berry", "10%", "right", "4%"], ["ياسمين", "floral", "30%", "left", "2%"], ["خوخ", "stone", "62%", "right", "0%"]].map(([t, f, top, side, off], i) => (
          <span key={t} className="note absolute rounded-full bg-[var(--card)] px-4 py-2 text-[16px] font-bold shadow-md"
            style={{ top, [side]: off, color: FAM[f], animationDelay: `${i * 0.6}s` }}>{t}</span>
        ))}
        <div className="absolute bottom-2 left-6 rounded-[24px] bg-[var(--card)] p-3 shadow-lg">
          <Ring value={92} play={shown} />
          <p className="mt-1 text-center text-[12px] font-semibold text-[var(--ink-2)]">توافق مع ذوقك</p>
        </div>
      </div>
    </Split>
  );
}

// MARK: Map and passport

const AR = (n: number) => n.toLocaleString("ar-SA");
// code, name, lat, lon, coffees in the guide (snapshot)
const ORIGINS: [string, string, number, number, number][] = [
  ["CO", "كولومبيا", 4.6, -75.6, 214], ["ET", "إثيوبيا", 7.0, 38.6, 157], ["BR", "البرازيل", -19.5, -45.5, 59], ["CR", "كوستاريكا", 9.9, -84.0, 43],
  ["SV", "السلفادور", 13.8, -89.2, 41], ["YE", "اليمن", 15.3, 43.9, 35], ["UG", "أوغندا", 1.0, 32.4, 34], ["ID", "إندونيسيا", -2.5, 112.0, 27],
  ["SA", "السعودية", 18.2, 42.5, 20], ["GT", "غواتيمالا", 14.8, -91.0, 16], ["PE", "بيرو", -9.2, -75.2, 8], ["PA", "بنما", 8.8, -80.4, 7],
  ["IN", "الهند", 12.4, 75.7, 6], ["RW", "رواندا", -1.9, 29.9, 5], ["CN", "الصين", 22.8, 100.9, 5], ["KE", "كينيا", -0.4, 37.0, 2],
];
const TRIED = new Set(["ET", "CO", "YE", "BR", "KE", "PA", "RW"]);
const project = (lat: number, lon: number) => ({
  x: ((lon - MAP_PROJ.LON0) / (MAP_PROJ.LON1 - MAP_PROJ.LON0)) * 100,
  y: ((MAP_PROJ.LAT0 - lat) / (MAP_PROJ.LAT0 - MAP_PROJ.LAT1)) * 100,
});

export function MapSection() {
  const [ref, shown] = useInView<HTMLDivElement>(0.4);
  const [lit, setLit] = useState(0);
  const order = ORIGINS.filter(([c]) => TRIED.has(c));
  useEffect(() => {
    if (!shown) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setLit(order.length); return; }
    const t = setInterval(() => setLit((n) => (n >= order.length + 3 ? 0 : n + 1)), 800);
    return () => clearInterval(t);
  }, [shown, order.length]);
  const litSet = new Set(order.slice(0, Math.min(lit, order.length)).map(([c]) => c));
  return (
    <Split kicker="خريطة المناطق" title="قهوتك من كل مكان." dark
      body={<>شوف من وين تجي قهاوي الدليل. كل دولة تجرّب منها تخضرّ على الخريطة وتنختم في جوازك، واضغط على أي دولة تشوف طعمها ومناطقها.</>}>
      <div ref={ref} className="w-full max-w-[560px]">
        <div className="relative w-full rounded-[28px] bg-[#2a201a] p-3 sm:p-5" dir="ltr">
          <div className="relative" style={{ aspectRatio: `${MAP_PROJ.W} / ${MAP_PROJ.H}` }}>
            <svg viewBox={`0 0 ${MAP_PROJ.W} ${MAP_PROJ.H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path d={LAND_DOTS} stroke="rgba(247,241,232,.22)" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            {ORIGINS.map(([code, name, lat, lon, n]) => {
              const { x, y } = project(lat, lon);
              const on = litSet.has(code);
              const size = Math.min(30, 9 + Math.sqrt(n) * 1.4);
              return (
                <div key={code} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
                  <div className="flex items-center justify-center rounded-full text-[9px] font-bold text-white transition-all duration-500"
                    style={{ width: size, height: size, background: on ? "var(--accent)" : "var(--gold-light)", opacity: on ? 1 : 0.85,
                      boxShadow: on ? "0 0 0 5px rgba(83,99,68,.35)" : "0 0 0 3px rgba(200,154,62,.18)", transform: on ? "scale(1.12)" : "none" }}>
                    {on ? "✓" : ""}
                  </div>
                  {n >= 30 && <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap text-[9px] text-[rgba(247,241,232,.7)] sm:text-[10px]">{name}</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-5 text-[13px] text-[var(--dark-ink-2)]">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />جرّبت منها</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--gold-light)]" />لسّا</span>
          <span className="rounded-full bg-[rgba(247,241,232,.1)] px-3 py-1 font-bold text-[var(--bg)]">جرّبت من {AR(litSet.size)} دول من {AR(ORIGINS.length)}</span>
        </div>
      </div>
    </Split>
  );
}

// MARK: Community

export function CommunitySection() {
  const [ref, shown] = useInView<HTMLDivElement>(0.4);
  const t = useLoop(9, 1000, shown);
  return (
    <Split kicker="المجتمع" title="القهوة أحلى مع ناسها."
      body={<>تحدي كل أسبوع تكسب فيه نقاط، وتعليقات على تجارب الناس وتقييماتهم، وتابع اللي ذوقهم قريب منك، و«توأم الذوق» يعرّفك عليهم.</>}>
      <div ref={ref} className="w-full max-w-[420px] space-y-4">
        <div className="rounded-[24px] bg-[var(--dark)] p-5 text-[var(--bg)]">
          <p className="text-[13px] font-semibold text-[var(--gold-light)]">تحدي الأسبوع 🏆</p>
          <p className="mt-1 text-[20px] font-bold">جرّب ٣ قهاوي إثيوبية</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[rgba(247,241,232,.15)]">
            <div className="h-full rounded-full bg-[var(--gold-light)] transition-all duration-700" style={{ width: `${Math.min(3, t) * 33.4}%` }} />
          </div>
          <p className="mt-2 text-[13px] text-[var(--dark-ink-2)]">{Math.min(3, t) >= 3 ? "خلّصته! +٥٠ نقطة 🎉" : `${AR(Math.min(3, t))} من ٣ · +٥٠ نقطة`}</p>
        </div>
        <div className="rounded-[24px] bg-[var(--card)] p-4 shadow-[0_1px_0_var(--line)]">
          <p className="text-[14px] font-bold">سارة قيّمت «إثيوبيا: قوجي» ★★★★★</p>
          <div className="mt-3 space-y-2">
            {[["نورة", "جربتها باردة؟ 🧊"], ["سارة", "إيه، رهيبة على الثلج"], ["محمد", "أضفتها لقائمتي ☕"]].map(([n, c], i) => (
              <div key={c} className="flex gap-2 text-[14px] transition-all duration-500" style={{ opacity: t > i + 1 ? 1 : 0, transform: t > i + 1 ? "none" : "translateY(8px)" }}>
                <b>{n}</b><span className="rounded-[14px] bg-[var(--bg-alt)] px-3 py-1">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 rounded-[24px] bg-[var(--card)] p-4 shadow-[0_1px_0_var(--line)]">
          <span className="text-[30px] transition-transform duration-700" style={{ transform: t >= 5 ? "translateX(-10px)" : "translateX(10px)" }}>☕</span>
          <span className="text-[22px] transition-all duration-500" style={{ opacity: t >= 5 ? 1 : 0, transform: t >= 5 ? "scale(1)" : "scale(.4)" }}>❤️</span>
          <span className="text-[30px] transition-transform duration-700" style={{ transform: t >= 5 ? "translateX(10px)" : "translateX(-10px)" }}>☕</span>
          <p className="text-[14px] font-bold">توأم ذوقك: ذوقه ٨٧٪ مثلك</p>
        </div>
      </div>
    </Split>
  );
}

// MARK: Lists

const LISTS = [
  { emoji: "☀️", title: "قهاوي الصيف", bags: [["#2f3b5c", "إثيوبيا"], ["#b5654a", "رواندا"], ["#c9a24a", "بنما"]] },
  { emoji: "🎁", title: "للضيوف", bags: [["#4A3428", "اليمن"], ["#6b5440", "البرازيل"], ["#9c3d2e", "كولومبيا"]] },
];

export function ListsSection() {
  const [ref, shown] = useInView<HTMLDivElement>(0.4);
  const t = useLoop(6, 1100, shown);
  return (
    <Split kicker="قوائمي" title="قوائمك، بأسمائك." flip alt
      body={<>سوِّ قائمة مثل «قهاوي الصيف» أو «للضيوف»، اكتب على كل قهوة ملاحظتك، وشاركها برابط مع أي أحد.</>}>
      <div ref={ref} className="relative flex w-full max-w-[440px] flex-col items-center gap-4">
        <div className="flex gap-4">
          {LISTS.map((l, i) => (
            <div key={l.title} className="w-[180px] rounded-[24px] bg-[var(--card)] p-3 shadow-md transition-all duration-700"
              style={{ transform: shown ? "none" : "translateY(30px) rotate(-4deg)", opacity: shown ? 1 : 0, transitionDelay: `${i * 250}ms` }}>
              <div className="grid grid-cols-2 gap-1.5 rounded-[16px] bg-[rgba(152,112,36,.1)] p-2" dir="ltr">
                {l.bags.map(([c, o]) => <div key={o} className="flex justify-center"><DrawnBag color={c} origin={o} width={58} /></div>)}
                <div className="flex items-center justify-center text-[30px]">{l.emoji}</div>
              </div>
              <p className="mt-2 text-[16px] font-bold">{l.title}</p>
              <p className="text-[13px] text-[var(--ink-2)]">{AR(l.bags.length)} قهاوي</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-[15px] font-bold text-[var(--bg)] transition-all duration-500"
          style={{ opacity: t >= 2 ? 1 : 0, transform: t >= 2 ? "none" : "scale(.85)" }} dir="ltr">
          bunnlist.com/lists/… <span>🔗</span>
        </div>
      </div>
    </Split>
  );
}

// MARK: A shelf of drawn bags

const SHELF: [string, string, string, string[]][] = [
  ["#2f3b5c", "إثيوبيا", "قوجي", ["توت", "ياسمين"]], ["#9c3d2e", "كولومبيا", "هويلا", ["كراميل", "تفاح"]],
  ["#536344", "كينيا", "نييري", ["كشمش", "جريب فروت"]], ["#4A3428", "اليمن", "حراز", ["زبيب", "كاكاو"]],
  ["#c9a24a", "بنما", "قيشا", ["ياسمين", "برغموت"]], ["#b5654a", "رواندا", "نياماشيكي", ["خوخ", "شاي"]],
  ["#6b5440", "البرازيل", "سيرادو", ["شوكولاتة", "بندق"]], ["#3f6e6a", "كوستاريكا", "تارازو", ["عسل", "مشمش"]],
  ["#7a4b6b", "السلفادور", "سانتا آنا", ["عنب", "سكر بني"]], ["#5f6f8a", "إندونيسيا", "سومطرة", ["بهارات", "كاكاو"]],
];

export function DrawnShelf() {
  const rows = [SHELF.slice(0, 5), SHELF.slice(5)];
  return (
    <div className="shelf relative space-y-5 overflow-hidden py-3" dir="ltr" aria-label="أمثلة من الدليل">
      {rows.map((row, r) => (
        <div key={r} className="flex w-max gap-4" style={{ animation: `shelf ${row.length * 6}s linear infinite ${r ? "reverse" : ""}` }}>
          {[...row, ...row, ...row, ...row].map(([c, o, n, notes], i) => (
            <div key={`${o}-${i}`} aria-hidden={i >= row.length} className="w-[170px] shrink-0 overflow-hidden rounded-[22px] bg-[var(--card)] shadow-[0_1px_0_var(--line)]" dir="rtl">
              <div className="flex h-[150px] items-center justify-center bg-gradient-to-b from-[#f3e9da] to-[#ead9bf]"><DrawnBag color={c} origin={o} width={92} /></div>
              <div className="p-3">
                <b className="text-[15px]">{o}: {n}</b>
                <div className="mt-2 flex gap-1">{notes.map((t) => <span key={t} className="rounded-full bg-[var(--bg-alt)] px-2 py-0.5 text-[11px]">{t}</span>)}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--bg)] to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--bg)] to-transparent sm:w-32" />
    </div>
  );
}
