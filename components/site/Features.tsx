"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LAND_DOTS, MAP_PROJ } from "@/lib/site-map";
import { lotByFile, type ShelfLot } from "@/lib/site-bags";

// «جديد في BunnList»: the newer parts of the app told like the story above. On
// wide screens one phone stays while the text scrolls and its screen plays the
// step in view; on phones each step brings its own. The coffees on the screens
// are real ones from the guide, shown the way the app shows them.

const AR = (n: number) => n.toLocaleString("ar-SA");
const FAM: Record<string, string> = {
  berry: "#B83345", citrus: "#F2BD33", stone: "#ED945C", floral: "#C28FDB", choc: "#5C3826", caramel: "#C78540",
  honey: "#E3B040", tea: "#85A854", tropical: "#FA9E26",
};

function useLoop(steps: number, ms: number, run: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!run) { setI(0); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setI(steps - 1); return; }
    const t = setInterval(() => setI((x) => (x + 1) % steps), ms);
    return () => clearInterval(t);
  }, [steps, ms, run]);
  return i;
}

function Bag({ lot, className = "", size = 80 }: { lot: ShelfLot; className?: string; size?: number }) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size * 1.2 }}>
      <Image src={`/site/bags/${lot.file}.jpg`} alt="" fill sizes={`${size * 2}px`} className="object-contain mix-blend-multiply" />
    </div>
  );
}

function Ring({ value, play, size = 56, stroke = 6, color = "#536344", label = true }: { value: number; play: boolean; size?: number; stroke?: number; color?: string; label?: boolean }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(74,52,40,.12)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={play ? c * (1 - value / 100) : c} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      {label && <span className="absolute inset-0 flex items-center justify-center font-bold" style={{ color, fontSize: size * 0.26 }}>{AR(value)}٪</span>}
    </div>
  );
}

const TABS: [string, string][] = [["⌂", "اكتشف"], ["▤", "مجموعتي"], ["☕", "حضّر"], ["◎", "المجتمع"], ["●", "حسابي"]];

/** The app's status bar, screen background and, inside the tabs, the tab bar. */
function Screen({ children, dark = false, tab, footer }: { children: ReactNode; dark?: boolean; tab?: number; footer?: ReactNode }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${dark ? "bg-[#1c140f] text-[#f7f1e8]" : "bg-[#f7f1e8] text-[#171411]"}`} dir="rtl">
      <div className="flex justify-between px-6 pt-3 text-[11px] font-semibold" dir="ltr"><span>9:41</span><span>●●● ▮</span></div>
      <div className="px-3.5 pt-3">{children}</div>
      {footer && <div className="absolute inset-x-3.5 bottom-6">{footer}</div>}
      {tab !== undefined && (
        <div className={`absolute inset-x-0 bottom-0 flex justify-around border-t px-2 pb-4 pt-2 backdrop-blur ${dark ? "border-white/10 bg-[#1c140f]/90" : "border-black/5 bg-[#f7f1e8]/95"}`}>
          {TABS.map(([icon, label], i) => (
            <span key={label} className={`flex flex-col items-center text-[9px] font-semibold ${i === tab ? "text-[#536344]" : "opacity-45"}`}>
              <span className="text-[15px] leading-5">{icon}</span>{label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// MARK: Screens

const ADVISOR_PICKS: [string, number, string][] = [
  ["kof-ethiopia-shakiso", 94, "ياسمين وتفاح أخضر، بدون مرارة"],
  ["mahmasa-oolala-blueberry", 89, "توت أزرق وفانيلا، منعشة على الثلج"],
  ["ash-grape-colombia", 85, "عنب وعسل، تجربة جديدة 🚀"],
];

function AdvisorScreen({ active }: { active: boolean }) {
  const t = useLoop(9, 1300, active);
  const step = t < 2 ? 0 : t < 3 ? 1 : t < 4 ? 2 : t < 5 ? 3 : 4;
  const footer = (
    <div className="rounded-full bg-[#536344] py-3 text-center text-[14px] font-bold text-[#f7f1e8]">
      {step === 4 ? "أضفها لقائمة" : step === 3 ? "طلّع لي قهوتي ✨" : "التالي"}
    </div>
  );
  return (
    <Screen footer={footer}>
      {step < 4 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(152,112,36,.18)]">
            <div className="h-full rounded-full bg-[#536344] transition-all duration-500" style={{ width: `${[20, 60, 80, 100][step]}%` }} />
          </div>
          <span className="text-[10px] font-bold text-[#7a6a5c]">{step === 3 ? "✨" : `${AR([1, 3, 4][step])} من ٥`}</span>
        </div>
      )}
      {step === 0 && (
        <div key="a" className="scene-in">
          <p className="mt-4 text-[21px] font-bold">وش جوّك اليوم؟</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[["☀️", "أبي أصحصح"], ["🛋️", "روقان"], ["👥", "عندي ضيوف"], ["🧭", "شي جديد"]].map(([e, l], i) => (
              <div key={l} className={`rounded-[16px] bg-white py-7 text-center transition-all duration-300 ${t === 1 && i === 1 ? "scale-105 ring-2 ring-[#536344]" : ""}`}>
                <div className="text-[28px]">{e}</div><div className="mt-1 text-[13px] font-bold">{l}</div>
                {i === 1 && <div className="text-[10px] text-[#7a6a5c]">أبي أهدأ</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div key="b" className="scene-in">
          <p className="mt-4 text-[21px] font-bold">وش يشدّك في الطعم؟</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[["توت", "berry", 1], ["شوكولاتة", "choc", 0], ["زهري", "floral", 1], ["حمضيات", "citrus", 0], ["كراميل", "caramel", 0], ["عسل", "honey", 0], ["شاي", "tea", 0]].map(([l, f, on]) => (
              <span key={l as string} className="rounded-full px-3 py-1.5 text-[13px] font-bold" style={on ? { background: FAM[f as string], color: "#fff" } : { background: "#fff" }}>{l as string}</span>
            ))}
          </div>
        </div>
      )}
      {step === 2 && (
        <div key="c" className="scene-in">
          <p className="mt-4 text-[21px] font-bold">حار ولا بارد؟</p>
          <div className="mt-3 flex h-[300px] gap-2">
            <div className="flex flex-1 scale-95 flex-col items-center justify-center rounded-[20px] bg-gradient-to-b from-[#f6d7b8] to-[#e9a86e] opacity-40"><span className="text-[40px]">☕</span><b>حار</b></div>
            <div className="flex flex-1 scale-[1.03] flex-col items-center justify-center rounded-[20px] bg-gradient-to-b from-[#dcecf2] to-[#9cc7d9] shadow-lg"><span className="text-[40px]">🧊</span><b>بارد</b></div>
          </div>
        </div>
      )}
      {step === 3 && (
        <div key="d" className="scene-in">
          <p className="mt-4 text-[21px] font-bold">تبي تقول شي زيادة؟</p>
          <div className="mt-3 rounded-[16px] border-2 border-[#536344] bg-white p-3 text-[13px] leading-relaxed">أبي شي يشبه قهوة جربتها في مقهى، طعمها توت وما فيها مرارة</div>
          <p className="mt-3 text-[12px] font-bold text-[#987024]">✨ فهمنا منك:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[["توت", "#B83345"], ["بدون مرارة", "#4A3428"], ["خفيفة", "#987024"]].map(([l, c], i) => (
              <span key={l} className="rounded-full px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: c, animation: `rise .5s ${i * 0.15}s both` }}>{l}</span>
            ))}
          </div>
        </div>
      )}
      {step === 4 && (
        <div key="e" className="scene-in">
          <p className="mt-1 text-center text-[11px] font-bold text-[#987024]">✨ قهوتك اليوم</p>
          <p className="text-center text-[19px] font-bold">لقينا لك ٣ تناسبك</p>
          <div className="mt-2 space-y-2">
            {ADVISOR_PICKS.map(([file, score, why], i) => {
              const lot = lotByFile(file);
              return (
                <div key={file} className={`flex items-center gap-2 rounded-[16px] bg-white p-2 ${i === 0 ? "ring-2 ring-[#987024]" : ""}`} style={{ animation: `rise .55s cubic-bezier(.2,.9,.3,1.2) ${i * 0.15}s both` }}>
                  <Bag lot={lot} size={46} />
                  <div className="min-w-0 flex-1">
                    {i === 0 && <span className="rounded-full bg-[#987024] px-2 py-0.5 text-[9px] font-bold text-white">الأنسب لك</span>}
                    <b className="block truncate text-[13px]">{lot.name}</b>
                    <span className="block truncate text-[10px] font-semibold text-[#536344]">{why}</span>
                  </div>
                  <Ring value={score} play={active} size={44} stroke={5} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Screen>
  );
}

function DailyScreen({ active }: { active: boolean }) {
  const pick = lotByFile("mamtad-roastery-manahasi-uganda");
  const forYou = ["alwaal-albari-shelshely-chelchele", "mahmasa-slop-colombia-sweida-250g"].map(lotByFile);
  return (
    <Screen tab={0}>
      <p className="text-[19px] font-bold">مساء الخير، سارة ☕</p>
      <div className="relative mt-3 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#4A3428] to-[#536344] p-3.5 text-[#f7f1e8]">
        <p className="text-[11px] font-bold text-[#c89a3e]">قهوة اليوم</p>
        <p className="text-[17px] font-bold">{pick.name}</p>
        <p className="text-[11px] opacity-80">{pick.origin} · {pick.process}</p>
        <div className="mt-2 flex items-end justify-between">
          <div className="rounded-[16px] bg-[#f7f1e8] p-1.5"><Ring value={92} play={active} size={54} /></div>
          <div className="float rounded-[16px] bg-white/90 p-1"><Bag lot={pick} size={78} /></div>
        </div>
        <p className="mt-2 text-[11px] opacity-90">لأنك تحب الفواكه الاستوائية والخوخ والمشمش</p>
        {active && ["مانجو", "مشمش"].map((n, i) => (
          <span key={n} className="note absolute rounded-full bg-white px-2 py-0.5 text-[10px] font-bold" style={{ top: i ? "44%" : "18%", left: i ? "40%" : "36%", color: i ? FAM.stone : FAM.tropical, animationDelay: `${i * 0.7}s` }}>{n}</span>
        ))}
      </div>
      <p className="mt-4 text-[15px] font-bold">لك <span className="text-[11px] font-normal text-[#7a6a5c]">على ذوقك، تتجدد كل يوم</span></p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {forYou.map((l, i) => (
          <div key={l.file} className="rounded-[16px] bg-white p-1.5" style={{ animation: active ? `rise .6s ${0.3 + i * 0.15}s both` : undefined }}>
            <div className="flex h-[92px] items-center justify-center rounded-[12px] bg-[rgba(194,143,219,.12)]"><Bag lot={l} size={66} /></div>
            <b className="mt-1 block truncate text-[12px]">{l.name}</b>
            <span className="block truncate text-[10px] text-[#7a6a5c]">{l.notes.slice(0, 2).join(" · ")}</span>
          </div>
        ))}
      </div>
    </Screen>
  );
}

const ORIGINS: [string, number, number, number][] = [
  ["CO", 4.6, -75.6, 214], ["ET", 7.0, 38.6, 157], ["BR", -19.5, -45.5, 59], ["CR", 9.9, -84.0, 43], ["SV", 13.8, -89.2, 41],
  ["YE", 15.3, 43.9, 35], ["UG", 1.0, 32.4, 34], ["ID", -2.5, 112.0, 27], ["SA", 18.2, 42.5, 20], ["GT", 14.8, -91.0, 16],
  ["PE", -9.2, -75.2, 8], ["PA", 8.8, -80.4, 7], ["IN", 12.4, 75.7, 6], ["RW", -1.9, 29.9, 5], ["KE", -0.4, 37.0, 2],
];
const TRIED = ["ET", "CO", "YE", "BR", "PA", "RW"];
const proj = (lat: number, lon: number) => ({
  x: ((lon - MAP_PROJ.LON0) / (MAP_PROJ.LON1 - MAP_PROJ.LON0)) * 100,
  y: ((MAP_PROJ.LAT0 - lat) / (MAP_PROJ.LAT0 - MAP_PROJ.LAT1)) * 100,
});

function MapScreen({ active }: { active: boolean }) {
  const t = useLoop(TRIED.length + 6, 700, active);
  const lit = new Set(TRIED.slice(0, Math.min(t, TRIED.length)));
  const sheet = t >= TRIED.length + 1;
  const eth = ["kof-ethiopia-shakiso", "black-knight-chelchele", "jesha-roastery-gogi-ethiopia"].map(lotByFile);
  return (
    <Screen dark>
      <p className="text-[19px] font-bold">خريطة المناطق</p>
      <p className="text-[12px] text-[#c89a3e]">جرّبت من {AR(lit.size)} دول من {AR(ORIGINS.length)}</p>
      <div className="-mx-3.5 mt-3 overflow-hidden" dir="ltr">
      <div className={`relative w-[210%] ${active ? "map-pan" : ""}`} style={{ aspectRatio: `${MAP_PROJ.W} / ${MAP_PROJ.H}` }}>
        <svg viewBox={`0 0 ${MAP_PROJ.W} ${MAP_PROJ.H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d={LAND_DOTS} stroke="rgba(247,241,232,.25)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {ORIGINS.map(([code, lat, lon, n]) => {
          const { x, y } = proj(lat, lon);
          const on = lit.has(code);
          const size = Math.min(22, 8 + Math.sqrt(n) * 1.1);
          return (
            <span key={code} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500"
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: on ? "#6f8a5a" : "#c89a3e",
                boxShadow: on ? "0 0 0 4px rgba(111,138,90,.35)" : "none", outline: sheet && code === "ET" ? "2px solid #fff" : "none" }} />
          );
        })}
      </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 rounded-t-[24px] bg-[#f7f1e8] p-3.5 text-[#171411] transition-transform duration-700"
        style={{ transform: sheet ? "translateY(0)" : "translateY(105%)" }}>
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-[#d8ccb8]" />
        <div className="flex items-baseline justify-between"><b className="text-[19px]">إثيوبيا 🇪🇹</b><span className="text-[11px] font-bold text-[#536344]">✓ جرّبت ٣</span></div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          {[["١٥٧", "قهوة"], ["٢١", "محمصة"], ["مجففة", "غالبًا"]].map(([v, l]) => (
            <div key={l} className="rounded-[12px] bg-white py-1.5"><b className="block text-[14px] text-[#4A3428]">{v}</b><span className="text-[9px] text-[#7a6a5c]">{l}</span></div>
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          {[["توت", "berry"], ["زهري", "floral"], ["حمضيات", "citrus"]].map(([l, f]) => <span key={l} className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: FAM[f] }}>{l}</span>)}
        </div>
        <div className="mt-2 flex justify-between">{eth.map((l) => <div key={l.file} className="rounded-[10px] bg-white p-1"><Bag lot={l} size={48} /></div>)}</div>
      </div>
    </Screen>
  );
}

function CommunityScreen({ active }: { active: boolean }) {
  const t = useLoop(8, 1000, active);
  const post = lotByFile("arriyadh-roaster-qasr-al-souh-panama");
  const done = Math.min(3, t);
  return (
    <Screen tab={3}>
      <div className="flex gap-1 rounded-full bg-[rgba(74,52,40,.08)] p-1 text-center text-[11px] font-bold">
        {["لك", "أتابعهم", "المتصدرين"].map((l, i) => <span key={l} className={`flex-1 rounded-full py-1 ${i === 0 ? "bg-white shadow-sm" : "text-[#7a6a5c]"}`}>{l}</span>)}
      </div>
      <div className="mt-3 rounded-[18px] bg-[#1c140f] p-3 text-[#f7f1e8]">
        <p className="text-[10px] font-bold text-[#c89a3e]">تحدي الأسبوع 🏆</p>
        <p className="text-[15px] font-bold">جرّب ٣ قهاوي إثيوبية</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#c89a3e] transition-all duration-700" style={{ width: `${done * 33.4}%` }} /></div>
        <p className="mt-1 text-[10px] opacity-80">{done >= 3 ? "خلّصته! +٥٠ نقطة 🎉" : `${AR(done)} من ٣ · ١٢٨ مشارك`}</p>
      </div>
      <div className="mt-3 rounded-[18px] bg-white p-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C28FDB] text-[12px] font-bold text-white">س</span>
          <div className="flex-1"><b className="text-[12px]">سارة</b><span className="block text-[10px] text-[#7a6a5c]">حضّرت {post.name} · V60 بارد</span></div>
          <span className="text-[11px] text-[#987024]">★★★★★</span>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-[12px] bg-[#f3ece1] p-1.5"><Bag lot={post} size={40} /><span className="text-[11px]">«حلاوة كمثرى ونهاية شاي، رهيبة على الثلج»</span></div>
        <div className="mt-2 space-y-1.5">
          {[["نورة", "جربتها حارة؟"], ["سارة", "إيه، بس الباردة أحلى 🧊"], ["محمد", "أضفتها لقائمتي ☕"]].map(([n, c], i) => (
            <div key={c} className="flex items-start gap-1.5 text-[11px] transition-all duration-500" style={{ opacity: t > i + 2 ? 1 : 0, transform: t > i + 2 ? "none" : "translateY(6px)" }}>
              <b>{n}</b><span className="rounded-[10px] bg-[#f3ece1] px-2 py-0.5">{c}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3 text-[11px] text-[#7a6a5c]"><span>💬 {AR(Math.max(0, Math.min(3, t - 2)))}</span><span>👍 مفيد ١٢</span></div>
      </div>
    </Screen>
  );
}

function ListsScreen({ active }: { active: boolean }) {
  const t = useLoop(7, 1100, active);
  const open = t >= 3;
  const lists = [
    { title: "للضيوف", emoji: "🎁", files: ["mahmasa-masna-al-qahwa-al-brazil-al-thahira", "asante-roastery-farida-khan", "bunista-peru-valle-dorado"] },
    { title: "قهاوي الصيف", emoji: "☀️", files: ["mahmasa-oolala-blueberry", "camel-step-colombia-descanso", "admi-roastery-rwanda-kiesha-muf"] },
  ];
  return (
    <Screen tab={1}>
      {!open ? (
        <div key="grid" className="scene-in">
          <p className="text-[19px] font-bold">قوائمي</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {lists.map((l, i) => (
              <div key={l.title} style={{ animation: `rise .55s ${i * 0.15}s both` }} className={`transition-transform ${t === 2 && i === 0 ? "scale-105" : ""}`}>
                <div className="grid grid-cols-2 gap-1 rounded-[16px] bg-[rgba(152,112,36,.12)] p-1.5">
                  {l.files.map((f) => <div key={f} className="flex justify-center rounded-[8px] bg-white/70"><Bag lot={lotByFile(f)} size={44} /></div>)}
                  <div className="flex items-center justify-center text-[24px]">{l.emoji}</div>
                </div>
                <b className="mt-1 block text-[13px]">{l.title}</b><span className="text-[10px] text-[#7a6a5c]">{AR(3)} قهاوي</span>
              </div>
            ))}
            <div className="flex aspect-square items-center justify-center rounded-[16px] border-2 border-dashed border-[#536344]/50 text-[26px] text-[#536344]">＋</div>
          </div>
        </div>
      ) : (
        <div key="detail" className="scene-in">
          <p className="text-[20px] font-bold">🎁 للضيوف</p>
          <p className="text-[11px] text-[#7a6a5c]">قهاوي ترضي الكل، تنفع مع الحليب</p>
          <div className="mt-2 space-y-2">
            {lists[0].files.map((f, i) => {
              const l = lotByFile(f);
              return (
                <div key={f} className="flex items-center gap-2 rounded-[14px] bg-white p-1.5" style={{ animation: `rise .5s ${i * 0.12}s both` }}>
                  <Bag lot={l} size={40} />
                  <div className="min-w-0 flex-1"><b className="block truncate text-[12px]">{l.name}</b><span className="text-[10px] text-[#7a6a5c]">“{["حلوة مع الحليب", "يحبها أبوي", "خفيفة للعصر"][i]}”</span></div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-[#536344] py-2 text-[12px] font-bold text-[#f7f1e8] transition-all duration-500" style={{ opacity: t >= 5 ? 1 : 0, transform: t >= 5 ? "none" : "scale(.9)" }} dir="ltr">
            bunnlist.com/lists/… 🔗
          </div>
        </div>
      )}
    </Screen>
  );
}

// MARK: The story

interface NewStep { kicker: string; title: string; body: string; screen: (active: boolean) => ReactNode }

const STEPS: NewStep[] = [
  { kicker: "ساعدني أختار", title: "محتار؟ نختار لك.", body: "جاوب كم سؤال، أو اكتب اللي في بالك بكلامك، ونطلع لك ثلاث قهاوي تناسبك ونقول لك ليش.", screen: (a) => <AdvisorScreen active={a} /> },
  { kicker: "على ذوقك", title: "كل يوم، قهوة لك.", body: "تقول لنا وش تحب أول ما تسجّل، وتترتّب القهاوي على ذوقك وتتجدد كل يوم. وكل ما قيّمت أكثر، صارت «قهوة اليوم» أدق.", screen: (a) => <DailyScreen active={a} /> },
  { kicker: "خريطة المناطق", title: "من وين قهوتك؟", body: "كل دولة على الخريطة بقهاويها وطعمها ومناطقها، وتخضرّ لما تجرّب منها وتنختم في جوازك.", screen: (a) => <MapScreen active={a} /> },
  { kicker: "المجتمع", title: "القهوة أحلى مع ناسها.", body: "تحدي كل أسبوع بنقاط، وتعليقات على تجارب الناس وتقييماتهم، وتابع اللي ذوقهم قريب منك.", screen: (a) => <CommunityScreen active={a} /> },
  { kicker: "قوائمي", title: "قوائمك، بأسمائك.", body: "«للضيوف» و«قهاوي الصيف»: اكتب على كل قهوة ملاحظتك، وشارك القائمة برابط مع أي أحد.", screen: (a) => <ListsScreen active={a} /> },
];

function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative aspect-[393/852] overflow-hidden rounded-[46px] bg-[#171411] p-[9px] shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10 ${className}`}>
      <div className="relative h-full w-full overflow-hidden rounded-[38px]">
        {children}
        <div className="absolute left-1/2 top-2 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-[#171411]" />
      </div>
    </div>
  );
}

export function NewStory() {
  const [active, setActive] = useState(0);
  const [inSection, setInSection] = useState(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const section = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index)); }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    const s = new IntersectionObserver(([e]) => setInSection(e.isIntersecting), { threshold: 0.05 });
    if (section.current) s.observe(section.current);
    return () => { io.disconnect(); s.disconnect(); };
  }, []);

  return (
    <section id="new" ref={section} className="relative scroll-mt-12 overflow-clip bg-[var(--dark)] px-5 pb-10 pt-24 text-[var(--bg)] sm:pt-32">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(200,154,62,.28),transparent)]" />
      <div className="relative mx-auto max-w-[1024px] text-center">
        <p className="text-[17px] font-semibold text-[var(--gold-light)]">✨ جديد في BunnList</p>
        <h2 className="shine mx-auto mt-3 max-w-[14ch] text-[44px] font-bold leading-[1.08] tracking-tight sm:text-[72px]">قهوتك تعرفك أكثر.</h2>
        <p className="mx-auto mt-5 max-w-[40ch] text-[19px] leading-relaxed text-[var(--dark-ink-2)] sm:text-[21px]">نختار لك على ذوقك، ونوريك من وين تجي قهوتك، ونجمعك مع ناسها.</p>
      </div>
      <div className="relative mx-auto mt-6 grid max-w-[1024px] gap-10 md:grid-cols-2">
        <div>
          {STEPS.map((s, i) => (
            <div key={s.title} ref={(el) => { refs.current[i] = el; }} data-index={i} className="flex min-h-[80vh] flex-col justify-center py-10 md:min-h-[90vh]">
              <div className={`transition-opacity duration-500 ${active === i ? "opacity-100" : "md:opacity-25"}`}>
                <p className="text-[17px] font-semibold text-[var(--gold-light)]">
                  <span className="me-2 inline-grid h-7 w-7 place-items-center rounded-full bg-[var(--gold-light)] text-[13px] text-[var(--dark)]">{AR(i + 1)}</span>
                  {s.kicker}
                </p>
                <h3 className="mt-3 text-[34px] font-bold leading-[1.12] tracking-tight sm:text-[48px]">{s.title}</h3>
                <p className="mt-4 max-w-[34ch] text-[19px] leading-relaxed text-[var(--dark-ink-2)]">{s.body}</p>
                <div className="mx-auto mt-8 w-[260px] md:hidden"><Phone>{s.screen(active === i && inSection)}</Phone></div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block">
          <div className="sticky top-[10vh] flex h-[80vh] items-center justify-center">
            <div className="relative h-full max-h-[660px]" style={{ aspectRatio: "393 / 852" }}>
              <div className="absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgba(111,138,90,.35),transparent)] blur-2xl transition-opacity duration-700" />
              <Phone className="h-full">
                {STEPS.map((s, i) => (
                  <div key={s.title} className={`absolute inset-0 transition-all duration-700 ease-out ${active === i ? "scale-100 opacity-100" : "pointer-events-none scale-[1.04] opacity-0"}`}>
                    {s.screen(active === i && inSection)}
                  </div>
                ))}
              </Phone>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
