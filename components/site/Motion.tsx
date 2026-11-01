"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ShelfLot } from "@/lib/site-bags";
import { AppLotCard } from "./AppLotCard";

// The site's motion: things rise into view, the story follows the scroll, bags
// drift past like a roaster's shelf, the brew clip lights its steps in time, and
// numbers count up. Plain IntersectionObserver and CSS; everything holds still
// for people who ask their device for reduced motion.

export function useInView<T extends Element>(threshold = 0.2, once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);
  return [ref, inView] as const;
}

/** Rises and fades in when it scrolls into view; `delay` (ms) staggers siblings. */
export function Reveal({ children, delay = 0, className = "", as = "div" }: {
  children: ReactNode; delay?: number; className?: string; as?: "div" | "li" | "article";
}) {
  const [ref, shown] = useInView<HTMLDivElement>(0.15);
  const Tag = as as "div";
  return (
    <Tag ref={ref} data-shown={shown} className={`reveal ${className}`} style={{ "--d": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** Counts up to `to` (Arabic digits) the first time it's seen. */
export function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const [ref, shown] = useInView<HTMLSpanElement>(0.6);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!shown) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setValue(to); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shown, to, duration]);
  return <span ref={ref}>{new Intl.NumberFormat("ar-SA").format(value)}</span>;
}

// MARK: The story

export interface StoryStep { kicker: string; title: string; body: string; image: string; alt: string }

/** Four steps; on wide screens the phone stays put and its screen follows the text. */
export function Story({ steps }: { steps: StoryStep[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="mx-auto grid max-w-[1024px] gap-10 md:grid-cols-2">
      <div>
        {steps.map((s, i) => (
          <div
            key={s.title}
            ref={(el) => { refs.current[i] = el; }}
            data-index={i}
            className="flex min-h-[70vh] flex-col justify-center py-10 md:min-h-[85vh]"
          >
            <div className={`transition-opacity duration-500 ${active === i ? "opacity-100" : "md:opacity-30"}`}>
              <p className="text-[17px] font-semibold text-[var(--gold)]">
                <span className="me-2 inline-grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)] text-[13px] text-[var(--bg)]">
                  {new Intl.NumberFormat("ar-SA").format(i + 1)}
                </span>
                {s.kicker}
              </p>
              <h3 className="mt-3 text-[32px] font-bold leading-[1.15] tracking-tight sm:text-[44px]">{s.title}</h3>
              <p className="mt-4 max-w-[36ch] text-[19px] leading-relaxed text-[var(--ink-2)]">{s.body}</p>
              {/* Phones: each step brings its own screen. */}
              <div className="relative mx-auto mt-8 aspect-[393/852] w-[230px] overflow-hidden rounded-[40px] bg-[var(--ink)] p-[8px] shadow-[0_24px_60px_rgba(74,52,40,0.22)] md:hidden">
                <div className="relative h-full w-full overflow-hidden rounded-[32px]">
                  <Image src={s.image} alt={s.alt} fill sizes="230px" className="object-cover object-top" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Wide screens: one phone that stays while the text scrolls. */}
      <div className="hidden md:block">
        <div className="sticky top-[12vh] flex h-[76vh] items-center justify-center">
          <div className="relative aspect-[393/852] h-full max-h-[640px] overflow-hidden rounded-[46px] bg-[var(--ink)] p-[9px] shadow-[0_30px_80px_rgba(74,52,40,0.25)]">
            <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-[var(--ink)]">
              {steps.map((s, i) => (
                <Image
                  key={s.image}
                  src={s.image}
                  alt={active === i ? s.alt : ""}
                  fill
                  sizes="300px"
                  className={`object-cover object-top transition-all duration-700 ease-out ${
                    active === i ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MARK: The shelf of bags

/** Two rows of bag cards, drawn as the app draws them, drifting in opposite
 *  directions like a roaster's shelf. */
export function BagShelf({ lots }: { lots: ShelfLot[] }) {
  const half = Math.ceil(lots.length / 2);
  const rows = [lots.slice(0, half), lots.slice(half)];
  return (
    <div className="shelf relative space-y-5 overflow-hidden py-3" dir="ltr" aria-label="محاصيل من الدليل">
      {rows.map((row, r) => (
        <div key={r} className="flex w-max gap-4" style={{ animation: `shelf ${row.length * 5}s linear infinite ${r ? "reverse" : ""}` }}>
          {[...row, ...row].map((lot, i) => (
            <AppLotCard key={`${lot.file}-${i}`} lot={lot} hidden={i >= row.length} />
          ))}
        </div>
      ))}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--bg)] to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--bg)] to-transparent sm:w-32" />
    </div>
  );
}

// MARK: Brewing, in step with the clip

/** Where each step sits in the brew clip (seconds): hot V60, then iced. */
const CLIP_STEPS: { label: string; from: number; to: number; iced?: boolean }[] = [
  { label: "الطحن", from: 3, to: 6.2 },
  { label: "التشريب", from: 6.2, to: 10.6 },
  { label: "الصبّة الأولى", from: 10.6, to: 14.8 },
  { label: "الصبّة الثانية", from: 14.8, to: 18.4 },
  { label: "التقطير", from: 18.4, to: 22.8 },
  { label: "جاهزة", from: 22.8, to: 29.2 },
  { label: "الثلج أولًا", from: 29.2, to: 32.4, iced: true },
  { label: "التشريب", from: 35, to: 38.8, iced: true },
  { label: "الصبّة", from: 38.8, to: 43, iced: true },
  { label: "التقطير", from: 43, to: 47, iced: true },
  { label: "باردة وجاهزة", from: 47, to: 54.6, iced: true },
];

export function BrewClip() {
  const video = useRef<HTMLVideoElement>(null);
  const [wrap, inView] = useInView<HTMLDivElement>(0.4, false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (inView) v.play().catch(() => {});
    else v.pause();
  }, [inView]);

  const iced = time >= 29.2;
  const current = CLIP_STEPS.findIndex((s) => time >= s.from && time < s.to);
  const shown = CLIP_STEPS.filter((s) => !!s.iced === iced);
  const progress = Math.min(time / 27, 1);

  return (
    <div ref={wrap} className="relative">
      {/* The room warms as the coffee brews, and cools for the iced one. */}
      <div
        className="pointer-events-none absolute inset-0 -z-0 transition-opacity duration-1000"
        style={{
          background: iced
            ? "radial-gradient(circle at 50% 45%, rgba(120,170,200,0.28), transparent 60%)"
            : "radial-gradient(circle at 50% 45%, rgba(200,140,60,0.32), transparent 60%)",
          opacity: 0.35 + (iced ? 0.5 : progress * 0.6),
        }}
      />
      <div className="relative mx-auto grid max-w-[1024px] items-center gap-10 md:grid-cols-[1fr_auto_1fr]">
        <ol className="order-2 space-y-2 md:order-1" aria-label="خطوات التحضير">
          <li className="mb-4 text-[15px] font-semibold text-[var(--gold-light)]">{iced ? "V60 مثلّج" : "V60 ساخن"}</li>
          {shown.map((s) => {
            const on = CLIP_STEPS[current] === s;
            return (
              <li
                key={`${s.label}-${s.from}`}
                className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[18px] transition-all duration-500 ${
                  on ? "bg-[rgba(200,154,62,0.16)] text-[var(--bg)]" : "text-[rgba(179,165,151,0.7)]"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${on ? "scale-125 bg-[var(--gold-light)]" : "bg-[rgba(179,165,151,0.35)]"}`} />
                {s.label}
              </li>
            );
          })}
        </ol>
        <div className="order-1 md:order-2">
          <div className="relative mx-auto aspect-[393/852] w-[260px] overflow-hidden rounded-[46px] bg-[var(--ink)] p-[9px] shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:w-[300px]">
            <div className="relative h-full w-full overflow-hidden rounded-[38px]">
              <video
                ref={video}
                className="h-full w-full object-cover"
                poster="/site/brew-v60-poster.jpg"
                muted
                loop
                playsInline
                preload="metadata"
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                aria-label="تحضير V60 ساخن ثم مثلّج في التطبيق"
              >
                <source src="/site/brew-v60.webm" type="video/webm" />
                <source src="/site/brew-v60.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
        <ul className="order-3 space-y-6 text-[17px] text-[var(--dark-ink-2)]">
          <li><b className="block text-[21px] text-[var(--bg)]">إيروبريس</b>تقليب ونقع، ثم ضغط هادئ حتى تسمع الهسهسة.</li>
          <li><b className="block text-[21px] text-[var(--bg)]">إسبريسو</b>يتدرّج لون الاستخلاص وتتكوّن الكريما، والهدف بين ٢٥ و٣٢ ثانية.</li>
          <li><b className="block text-[21px] text-[var(--bg)]">قهوة عربية</b>دلّة على النار، ثم البن والهيل، فتركد قبل أن تُصبّ في الفنجال.</li>
        </ul>
      </div>
    </div>
  );
}

/** Steam curling up over the app icon in the hero. */
export function Steam() {
  return (
    <svg className="steam pointer-events-none absolute -top-12 left-1/2 h-14 w-16 -translate-x-1/2" viewBox="0 0 64 56" fill="none" aria-hidden="true">
      {[20, 32, 44].map((x, i) => (
        <path key={x} d={`M${x} 54 q 7 -10 0 -20 q -7 -10 0 -20`} stroke="rgba(152,112,36,0.45)" strokeWidth="3.5" strokeLinecap="round" style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
    </svg>
  );
}
