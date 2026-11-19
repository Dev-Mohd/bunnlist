import { SiteFooter } from "@/components/site/Chrome";
import { ScrollStory } from "@/components/site/story/ScrollStory";
import { SITE_URL } from "@/lib/site";

// The BunnList site: one scroll whose job is the download. Each part of the app is a
// full-screen room with one line and one drawing that plays as you scroll (see
// components/site/story). Every button goes through /get, which sends the visitor to
// the right store for their phone. Everything described is in the app.

const faq: [string, string][] = [
  ["التطبيق مجاني؟", "نعم، مجاني كله وبدون إعلانات. ما فيه اشتراك ولا مزايا مقفلة."],
  ["لازم أسجّل؟", "لا. تقدر تتصفح وتحضّر كضيف، وتسجّل بعدين إذا تبي تحفظ تحضيراتك وتقييماتك."],
  ["يشتغل على أندرويد؟", "نعم، على iPhone وعلى Android."],
  ["قهوتي مو موجودة، وش أسوي؟", "صوّر الكيس أو اقترحها من التطبيق، ونضيفها للدليل."],
  ["أحتاج ميزان ومطحنة؟", "الميزان يكفي. وإذا عندك مطحنة من الـ123 اللي في الدليل، نعطيك رقم الطحنة عليها."],
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "BunnList",
    operatingSystem: "iOS, Android",
    applicationCategory: "LifestyleApplication",
    inLanguage: "ar",
    url: SITE_URL,
    description: "دليل القهوة المختصة في السعودية: محاصيل المحامص السعودية بنكهاتها وتقييماتها، ووصفات تحضير خطوة بخطوة.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  },
];

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <ScrollStory />
        <section className="bg-[var(--bg)] px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-[760px]">
            <h2 className="text-[28px] font-bold sm:text-[36px]">أسئلة تتكرر</h2>
            <dl className="mt-6 divide-y divide-[var(--line)]">
              {faq.map(([q, a]) => (
                <div key={q} className="py-5">
                  <dt className="text-[18px] font-bold">{q}</dt>
                  <dd className="mt-2 text-[16px] leading-8 text-[var(--ink-2)]">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
