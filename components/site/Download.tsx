"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// The site's download buttons. Every one points at /get, which sends the visitor to the
// right place for their phone and counts the tap. Here the label is fitted to the phone
// once the page is open: «حمّل من App Store» on an iPhone, «حمّل على Android» on Android.

type Store = "ios" | "android" | "other";

function useStore(): Store | null {
  const [store, setStore] = useState<Store | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac; a Mac with a touch screen is an iPad.
    const iPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    setStore(/iPhone|iPad|iPod/i.test(ua) || iPad ? "ios" : /Android/i.test(ua) ? "android" : "other");
  }, []);
  return store;
}

const LABEL: Record<Store, string> = { ios: "حمّل من App Store", android: "حمّل على Android", other: "حمّل التطبيق" };

function DownloadGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M5 21h14" />
    </svg>
  );
}

/** The one big button phones see. `from` names the button for the counts. */
export function StoreButton({ from, tone = "ink", className = "" }: { from: string; tone?: "ink" | "gold"; className?: string }) {
  const store = useStore();
  const colors = tone === "gold" ? "bg-[#e2b75c] text-[var(--ink)]" : "bg-[var(--ink)] text-[var(--bg)]";
  return (
    <a
      href={`/get?from=${from}`}
      className={`inline-flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full px-7 text-[18px] font-bold transition-transform duration-200 active:scale-[0.98] sm:w-auto sm:min-w-[280px] ${colors} ${className}`}
    >
      <DownloadGlyph />
      {LABEL[store ?? "other"]}
    </a>
  );
}

/** Under the closing button: the way to the other platform. */
export function OtherStoreLink({ from }: { from: string }) {
  const store = useStore();
  if (store === "ios") return <a className="underline-offset-4 hover:underline" href={`/get?p=android&from=${from}`}>عندك أندرويد؟ حمّل نسخة Android</a>;
  if (store === "android") return <a className="underline-offset-4 hover:underline" href={`/get?p=ios&from=${from}`}>عندك آيفون؟ حمّله من App Store</a>;
  return <span>iPhone بنظام iOS 17 أو أحدث · Android 8 أو أحدث</span>;
}

/** Phones only: a bar that stays at the bottom with the app and one button. Shows once the hero's button has scrolled away. */
export function StickyDownloadBar() {
  const store = useStore();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      aria-hidden={!shown}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(247,241,232,0.92)] px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-300 md:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <Image src="/site/app-icon.png" alt="" width={44} height={44} className="rounded-[12px] shadow-[0_4px_12px_rgba(74,52,40,0.18)]" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[16px] font-bold" dir="ltr" style={{ textAlign: "right" }}>BunnList</p>
          <p className="text-[12.5px] text-[var(--ink-2)]">مجاني · {store === "android" ? "Android" : store === "ios" ? "App Store" : "iPhone و Android"}</p>
        </div>
        <a
          href="/get?from=bar"
          tabIndex={shown ? 0 : -1}
          className="rounded-full bg-[var(--accent)] px-6 py-3 text-[16px] font-bold text-[var(--bg)] transition-transform active:scale-95"
        >
          حمّل
        </a>
      </div>
    </div>
  );
}
