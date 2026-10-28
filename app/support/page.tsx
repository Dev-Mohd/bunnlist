import type { Metadata } from "next";
import { DocPage } from "@/components/site/Chrome";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "الدعم" };

const faqs: [string, string][] = [
  ["كيف أنشئ حسابًا؟", "من «حسابي» سجّل الدخول عبر Apple أو Google، أو برمز يصل إلى بريدك. ويمكنك تصفّح الدليل دون حساب."],
  ["لم أجد قهوتي في الدليل", "صوّر الكيس من زر الكاميرا بجوار البحث، وسيقترحه التطبيق للإضافة لنراجعه."],
  ["كيف أحدد مطحنتي؟", "من «حسابي» ثم «مطحنتي»، أو من شاشة «حضّر» أسفل الوصفة. بعدها يقرّب لك التطبيق درجة الطحن المناسبة."],
  ["كيف أتحكم في الإشعارات؟", "من «حسابي» ثم «الإعدادات» ثم «الإشعارات»، وأوقف ما لا تحتاجه."],
  ["كيف أحذف حسابي؟", "من «حسابي» ثم «الإعدادات» ثم «حذف الحساب». والحذف نهائي."],
  ["كيف أبلّغ عن محتوى؟", "استخدم زر «بلّغ» في التقييم أو الوصفة أو الملف الشخصي."],
];

export default function SupportPage() {
  return (
    <DocPage title="الدعم">
      <p>
        لديك سؤال أو مشكلة أو اقتراح؟ راسلنا على{" "}
        <a className="text-[var(--accent)] underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>، وسنردّ عليك.
      </p>
      <h2>أسئلة شائعة</h2>
      <dl className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {faqs.map(([q, a]) => (
          <div key={q} className="py-5">
            <dt className="font-semibold">{q}</dt>
            <dd className="mt-1 text-[var(--ink-2)]">{a}</dd>
          </div>
        ))}
      </dl>
    </DocPage>
  );
}
