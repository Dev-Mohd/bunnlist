import Link from "next/link";
import { BunnListLogo } from "@/components/Logo";
import { ANDROID_PAGE, APP_STORE_URL, AVAILABILITY, CONTACT_EMAIL } from "@/lib/site";

const links = [
  { href: "/#new", label: "الجديد" },
  { href: "/#discover", label: "اكتشف" },
  { href: "/#brew", label: "حضّر" },
  { href: ANDROID_PAGE, label: "Android" },
];

/** A thin frosted bar, like Apple's global nav. */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(247,241,232,0.8)] backdrop-blur-xl backdrop-saturate-150">
      <nav className="mx-auto flex h-12 max-w-[1024px] items-center justify-between gap-4 px-4 sm:px-6" aria-label="الرئيسية">
        <Link href="/" aria-label="BunnList" className="shrink-0">
          <BunnListLogo className="scale-[0.62] origin-right" />
        </Link>
        <ul className="hidden items-center gap-7 text-[12.5px] text-[var(--ink)]/80 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="transition-colors hover:text-[var(--ink)]">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[var(--bg-alt)] text-[12px] leading-6 text-[var(--ink-2)]">
      <div className="mx-auto max-w-[1024px] px-4 py-8 sm:px-6">
        <p className="border-b border-[var(--line)] pb-4">
          BunnList تطبيق لأجهزة iPhone وAndroid، {AVAILABILITY}. أسماء المحاصيل وصور أكياسها ملك لمحامصها، تُعرض بإذنهم أو
          من مصادرهم المنشورة، وتُحذف متى طلبوا ذلك.
        </p>
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BunnList. جميع الحقوق محفوظة.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li><Link className="hover:text-[var(--ink)]" href="/privacy">الخصوصية</Link></li>
            <li><Link className="hover:text-[var(--ink)]" href="/terms">الشروط</Link></li>
            <li><Link className="hover:text-[var(--ink)]" href="/support">الدعم</Link></li>
            <li><a className="hover:text-[var(--ink)]" href={`mailto:${CONTACT_EMAIL}`}>راسلنا</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

/** «حمّل من App Store»: a pill linking to the listing. (Kept the old name so every page picks it up.) */
export function ComingSoon({ dark = false }: { dark?: boolean }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium transition-opacity hover:opacity-85 ${
        dark ? "bg-[var(--bg)] text-[var(--ink)]" : "bg-[var(--ink)] text-[var(--bg)]"
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
      </svg>
      حمّل من App Store
    </a>
  );
}

/** «حمّل على Android»: opens the page that explains installing outside Google Play. */
export function AndroidButton({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      href={ANDROID_PAGE}
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[15px] font-medium transition-opacity hover:opacity-85 ${
        dark ? "border-[var(--bg)] text-[var(--bg)]" : "border-[var(--ink)] text-[var(--ink)]"
      }`}
    >
      <AndroidGlyph />
      حمّل على Android
    </Link>
  );
}

/** Both ways to get the app, side by side. */
export function DownloadButtons({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <ComingSoon dark={dark} />
      <AndroidButton dark={dark} />
    </div>
  );
}

/** A plain robot head, drawn here (not the trademarked logo file). */
export function AndroidGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M7.2 4.1 6 2.4a.4.4 0 0 1 .7-.4l1.2 1.8A8 8 0 0 1 12 3c1.5 0 2.9.3 4.1.8L17.3 2a.4.4 0 0 1 .7.4l-1.2 1.7A7 7 0 0 1 20 10H4a7 7 0 0 1 3.2-5.9ZM8.5 7.8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM4 11.5h16V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7.5Z" />
    </svg>
  );
}

/** A screen shown in a simple iPhone frame. */
export function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto aspect-[393/852] w-[260px] rounded-[46px] bg-[var(--ink)] p-[9px] shadow-[0_30px_80px_rgba(74,52,40,0.25)] sm:w-[300px] ${className}`}>
      <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-[var(--ink)]">{children}</div>
    </div>
  );
}

/** Legal and help pages: a narrow column of plain type. */
export function DocPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-[692px] px-5 pb-24 pt-14 sm:pt-20">
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight sm:text-[48px]">{title}</h1>
        {updated ? <p className="mt-3 text-[14px] text-[var(--ink-2)]">آخر تحديث: {updated}</p> : null}
        <div className="doc mt-10 space-y-6 text-[17px] leading-[1.75] text-[var(--ink)] [&_h2]:mt-10 [&_h2]:text-[24px] [&_h2]:font-semibold [&_li]:mr-5 [&_li]:list-disc [&_p]:text-[var(--ink)]/90 [&_ul]:space-y-2">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
