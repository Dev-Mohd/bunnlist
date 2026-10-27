import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ComingSoon } from "@/components/site/Chrome";

// Shared coffee links (bunnlist.com/coffees/<slug>) open straight in the app
// through Universal Links. This page only shows when the app isn't installed.
export const metadata: Metadata = { title: "افتحها في BunnList", robots: { index: false } };

export default function SharedCoffee() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6 text-center">
      <Image src="/site/app-icon.png" alt="BunnList" width={96} height={96} className="rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]" />
      <h1 className="mt-8 text-[32px] font-bold tracking-tight sm:text-[44px]">هذه القهوة تُفتح في التطبيق.</h1>
      <p className="mt-4 max-w-[30ch] text-[19px] leading-relaxed text-[var(--ink-2)]">
        وصلك رابط قهوة من BunnList. ثبّت التطبيق، وسيفتح لك الرابط المحصول مباشرة.
      </p>
      <div className="mt-8"><ComingSoon /></div>
      <Link href="/" className="mt-6 text-[15px] text-[var(--accent)] underline">تعرّف على BunnList</Link>
    </main>
  );
}
