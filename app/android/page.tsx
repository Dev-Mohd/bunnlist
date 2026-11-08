import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import { AndroidGlyph, SiteFooter, SiteNav } from "@/components/site/Chrome";
import { ANDROID_APK_LOCAL, ANDROID_APK_URL, ANDROID_MIN, CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "BunnList على Android",
  description: "حمّل تطبيق BunnList لأجهزة Android مباشرة من موقعنا، مع خطوات التثبيت من خارج Google Play.",
};

// The APK is ready when it's hosted elsewhere, or when the file sits in public/download.
const apkReady =
  ANDROID_APK_URL !== ANDROID_APK_LOCAL || existsSync(path.join(process.cwd(), "public", ANDROID_APK_LOCAL));

const steps: { title: string; body: string }[] = [
  {
    title: "حمّل الملف",
    body: "اضغط «حمّل ملف التطبيق» تحت. لو سألك المتصفح «قد يضرّ هذا الملف بجهازك»، اختر «تنزيل على أي حال». الملف من موقعنا نفسه.",
  },
  {
    title: "افتحه",
    body: "افتح الملف من إشعار التنزيل، أو من تطبيق «ملفاتي» ثم «التنزيلات».",
  },
  {
    title: "اسمح بالتثبيت من هذا المصدر",
    body: "أول مرة يطلع لك «لأسباب أمنية، لا يُسمح لهاتفك بتثبيت تطبيقات غير معروفة من هذا المصدر». اضغط «الإعدادات»، وفعّل «السماح من هذا المصدر»، وارجع.",
  },
  {
    title: "ثبّت",
    body: "اضغط «تثبيت». لو نبّهك Google Play Protect أن التطبيق غير معروف، اضغط «مزيد من التفاصيل» ثم «التثبيت على أي حال».",
  },
  {
    title: "افتح BunnList",
    body: "اضغط «فتح»، وسجّل دخولك بـ Google أو برمز يصلك على بريدك.",
  },
];

const notes: { title: string; body: string }[] = [
  {
    title: "جوالات سامسونج",
    body: "لو ما طلع لك زر «تثبيت» أبدًا، فالغالب أن «الحظر التلقائي» شغّال. افتح الإعدادات ← الأمان والخصوصية ← الحظر التلقائي، وأوقفه وقت التثبيت، ثم شغّله من جديد إذا تبي.",
  },
  {
    title: "التحديثات",
    body: "لما ينزل إصدار جديد حمّله من هذي الصفحة وثبّته فوق القديم. بياناتك وحسابك يبقون مثل ما هم.",
  },
  {
    title: "Google Play",
    body: "التطبيق في طريقه إلى Google Play. إذا نزل هناك وتبي تنتقل له، احذف هذي النسخة أول ثم ثبّته من المتجر، وحسابك محفوظ.",
  },
];

export default function AndroidPage() {
  return (
    <>
      <SiteNav />
      <main className="bg-[var(--bg)]">
        <section className="px-5 pb-12 pt-14 text-center sm:pt-20">
          <Image src="/site/app-icon.png" alt="أيقونة BunnList" width={80} height={80} priority className="mx-auto rounded-[20px] shadow-[0_10px_30px_rgba(74,52,40,0.18)]" />
          <p className="mt-6 inline-flex items-center gap-2 text-[17px] font-semibold text-[var(--accent)]">
            <AndroidGlyph size={18} /> Android
          </p>
          <h1 className="mx-auto mt-2 max-w-[16ch] text-[40px] font-bold leading-[1.1] tracking-tight sm:text-[60px]">BunnList على جوالك.</h1>
          <p className="mx-auto mt-5 max-w-[38ch] text-[19px] leading-relaxed text-[var(--ink-2)]">
            حمّل التطبيق مباشرة من موقعنا، قبل ما يوصل Google Play. التثبيت يأخذ دقيقة، والخطوات تحت.
          </p>
          <div className="mt-8">
            {apkReady ? (
              <a
                href={ANDROID_APK_URL}
                download="BunnList.apk"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3 text-[17px] font-medium text-[var(--bg)] transition-opacity hover:opacity-85"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
                </svg>
                حمّل ملف التطبيق
              </a>
            ) : (
              <span className="inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-[17px] font-medium text-[var(--bg)]">الملف قريبًا</span>
            )}
          </div>
          <p className="mt-4 text-[14px] text-[var(--ink-2)]">{ANDROID_MIN} أو أحدث · مجاني</p>
        </section>

        <section className="px-5 pb-16">
          <div className="mx-auto max-w-[720px]">
            <h2 className="text-[28px] font-bold tracking-tight sm:text-[36px]">طريقة التثبيت</h2>
            <ol className="mt-6 space-y-3">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-4 rounded-[24px] bg-[var(--card)] p-5 shadow-[0_1px_0_var(--line)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[16px] font-bold text-[var(--bg)]">
                    {(i + 1).toLocaleString("ar-SA")}
                  </span>
                  <div>
                    <h3 className="text-[19px] font-semibold">{s.title}</h3>
                    <p className="mt-1 text-[16px] leading-relaxed text-[var(--ink-2)]">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[var(--bg-alt)] px-5 py-16">
          <div className="mx-auto grid max-w-[720px] gap-4">
            {notes.map((n) => (
              <div key={n.title} className="rounded-[24px] bg-[var(--card)] p-5 shadow-[0_1px_0_var(--line)]">
                <h3 className="text-[19px] font-semibold">{n.title}</h3>
                <p className="mt-1 text-[16px] leading-relaxed text-[var(--ink-2)]">{n.body}</p>
              </div>
            ))}
            <p className="mt-2 text-center text-[15px] text-[var(--ink-2)]">
              واجهتك مشكلة؟{" "}
              <a className="font-medium text-[var(--accent)] underline-offset-4 hover:underline" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("تثبيت BunnList على Android")}`}>
                راسلنا
              </a>{" "}
              واكتب لنا نوع جوالك.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
