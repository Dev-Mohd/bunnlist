import Link from "next/link";
import { SiteFooter, SiteNav } from "@/components/site/Chrome";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-[17px] font-semibold text-[var(--accent)]">404</p>
        <h1 className="mt-2 text-[34px] font-bold tracking-tight sm:text-[48px]">الصفحة مو موجودة.</h1>
        <Link href="/" className="mt-6 text-[17px] text-[var(--accent)] underline">ارجع للرئيسية</Link>
      </main>
      <SiteFooter />
    </>
  );
}
