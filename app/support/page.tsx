import type { Metadata } from "next";
import { DocPage } from "@/components/site/Chrome";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "الدعم" };

const faqs: [string, string][] = [
  ["كيف أسجّل؟", "من «حسابي» سجّل بـ Apple أو Google أو برمز يوصلك على البريد. وتقدر تتصفح الدليل بدون حساب."],
  ["ما لقيت قهوتي في الدليل", "صوّر الكيس من زر الكاميرا جنب البحث، والتطبيق يقترحه للدليل ونراجعه."],
  ["كيف أختار مطحنتي؟", "من «حسابي» ← «مطحنتي»، أو من «حضّر» تحت الوصفة. بعدها يقرّب لك التطبيق رقم الطحنة."],
  ["الإشعارات كثيرة", "من «حسابي» ← الإعدادات ← الإشعارات، وأوقف اللي ما تبيه."],
  ["كيف أحذف حسابي؟", "من «حسابي» ← الإعدادات ← حذف الحساب. الحذف نهائي."],
  ["أبي أبلّغ عن محتوى", "من زر «بلّغ» في التقييم أو الوصفة أو الملف الشخصي."],
];

export default function SupportPage() {
  return (
    <DocPage title="الدعم">
      <p>
        عندك سؤال أو مشكلة أو اقتراح؟ راسلنا على{" "}
        <a className="text-[var(--accent)] underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ونرد عليك.
      </p>
      <h2>أسئلة متكررة</h2>
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
