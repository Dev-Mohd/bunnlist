import Link from "next/link";
import { BunnListLogo } from "@/components/Logo";
import { AVAILABILITY, CONTACT_EMAIL } from "@/lib/site";

const links = [
  { href: "/#discover", label: "اكتشف" },
  { href: "/#brew", label: "حضّر" },
  { href: "/#features", label: "المميزات" },
  { href: "/#specs", label: "المواصفات" },
  { href: "/#roasters", label: "للمحامص" },
];

/** A thin frosted bar, like Apple's global nav. */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white/75 backdrop-blur-xl backdrop-saturate-150">
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
        <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-[12px] font-medium text-white">قريبًا</span>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[var(--bg-alt)] text-[12px] leading-6 text-[var(--ink-2)]">
      <div className="mx-auto max-w-[1024px] px-4 py-8 sm:px-6">
        <p className="border-b border-[var(--line)] pb-4">
          BunnList تطبيق لأجهزة iPhone، {AVAILABILITY}. أسماء المحاصيل وصور أكياسها لأصحابها من المحامص، وتُعرض بإذنهم أو
          من مصادرهم المنشورة، وتُحذف عند طلبهم.
        </p>
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BunnList. جميع الحقوق محفوظة.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li><Link className="hover:text-[var(--ink)]" href="/privacy">الخصوصية</Link></li>
            <li><Link className="hover:text-[var(--ink)]" href="/terms">الشروط</Link></li>
            <li><Link className="hover:text-[var(--ink)]" href="/support">الدعم</Link></li>
            <li><a className="hover:text-[var(--ink)]" href={`mailto:${CONTACT_EMAIL}`}>تواصل معنا</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

/** "قريبًا على App Store" as a quiet pill (no store badge until the listing exists). */
export function ComingSoon({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium ${
        dark ? "bg-white text-black" : "bg-[var(--ink)] text-white"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 10.6V6h-2v7.4l5 3 1-1.7-4-2.1Z" />
      </svg>
      {AVAILABILITY}
    </span>
  );
}

/** A screen shown in a simple iPhone frame. */
export function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto aspect-[393/852] w-[260px] rounded-[46px] bg-black p-[9px] shadow-[0_30px_80px_rgba(0,0,0,0.18)] sm:w-[300px] ${className}`}>
      <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-black">{children}</div>
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
