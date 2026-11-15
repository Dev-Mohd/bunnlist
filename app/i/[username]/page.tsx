import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ComingSoon } from "@/components/site/Chrome";
import { prisma } from "@/lib/prisma";

// A founder's invitation (bunnlist.com/i/<username>). With the app installed it opens the
// founders page there; otherwise this page says who invited you and how to credit them.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دعوة إلى BunnList", robots: { index: false } };

export default async function Invite({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const handle = decodeURIComponent(username).replace(/^@+/, "").slice(0, 40);
  const founder = /^[A-Za-z0-9._-]+$/.test(handle)
    ? await prisma.mobileProfile.findFirst({
        where: { username: { equals: handle, mode: "insensitive" }, founderNumber: { not: null } },
        select: { username: true, displayName: true, founderNumber: true },
      }).catch(() => null)
    : null;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6 py-16 text-center">
      <Image src="/site/app-icon.png" alt="BunnList" width={96} height={96} className="rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]" />
      {founder ? (
        <>
          <p className="mt-8 text-[15px] text-[var(--ink-2)]">مبدع مؤسس #{String(founder.founderNumber).padStart(2, "0")}</p>
          <h1 className="mt-2 text-[32px] font-bold tracking-tight sm:text-[44px]">{founder.displayName ?? `@${founder.username}`} يدعوك إلى BunnList.</h1>
          <p className="mt-4 max-w-[32ch] text-[19px] leading-relaxed text-[var(--ink-2)]">
            دليل القهوة المختصة في السعودية. ثبّت التطبيق، وبعد التسجيل افتح «المؤسسون» واختر <span dir="ltr">@{founder.username}</span> عشان تنحسب دعوته.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-[32px] font-bold tracking-tight sm:text-[44px]">وصلتك دعوة إلى BunnList.</h1>
          <p className="mt-4 max-w-[30ch] text-[19px] leading-relaxed text-[var(--ink-2)]">دليل القهوة المختصة في السعودية. مجاني.</p>
        </>
      )}
      <div className="mt-8"><ComingSoon /></div>
      <Link href="/" className="mt-6 text-[15px] text-[var(--accent)] underline">تعرّف على BunnList</Link>
    </main>
  );
}
