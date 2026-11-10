import Image from "next/image";
import { AndroidGlyph, PhoneFrame, SiteFooter, SiteNav } from "@/components/site/Chrome";
import { OtherStoreLink, StickyDownloadBar, StoreButton } from "@/components/site/Download";
import { Reveal } from "@/components/site/Motion";
import { SITE_URL } from "@/lib/site";

// The BunnList site: one short page whose job is the download. The first screen makes the
// promise and carries the button; three benefits, the champions' recipes and three quick
// answers follow, each within reach of a button. Every button goes through /get, which
// sends the visitor to the right store for their phone. Everything described is in the app.

const stats: [string, string][] = [
  ["+700", "محصول"],
  ["+40", "محمصة سعودية"],
  ["123", "مطحنة في الدليل"],
];

const benefits: { kicker: string; title: string; body: string; image: string; alt: string }[] = [
  {
    kicker: "اكتشف",
    title: "اعرف وش تشتري",
    body: "قارن المحاصيل بنكهاتها ومنشئها وتقييم الناس قبل لا تدفع.",
    image: "/site/discover.jpg",
    alt: "شاشة «اكتشف» في التطبيق",
  },
  {
    kicker: "حضّر",
    title: "حضّرها صح",
    body: "مؤقّت يمشي معك بالثانية، ويقترح درجة الطحن على مطحنتك.",
    image: "/site/brew-v60-poster.jpg",
    alt: "شاشة التحضير خطوة بخطوة",
  },
  {
    kicker: "ساعدني أختار",
    title: "محتار؟ نختار لك",
    body: "جاوب كم سؤال، ونطلع لك ثلاث قهاوي على ذوقك.",
    image: "/site/taste.jpg",
    alt: "شاشة تقييم الطعم",
  },
];

const more = ["صوّر الكيس ونتعرّف عليه", "خريطة مناطق القهوة", "دليل المطاحن", "قوائمك الخاصة", "تحدي كل أسبوع", "مجتمع محبي القهوة"];

// The recipes as the app runs them (core BrewGuide): grams per pour, in order.
const champions: { credit: string; name: string; who: string; specs: string[]; pours: { grams: number; label: string; color: string }[]; tip: string }[] = [
  {
    credit: "بطل العالم لتحضير القهوة 2016",
    name: "طريقة ٤:٦",
    who: "تيتسو كاسويا",
    specs: ["٢٠غ بن", "٣٠٠غ ماء", "٩٢°م", "٣:٣٠"],
    pours: [
      { grams: 50, label: "٥٠غ", color: "#987024" },
      { grams: 70, label: "٧٠غ", color: "#b8873a" },
      { grams: 60, label: "٦٠غ", color: "#536344" },
      { grams: 60, label: "٦٠غ", color: "#6b7b58" },
      { grams: 60, label: "٦٠غ", color: "#8a9a74" },
    ],
    tip: "أول صبتين للحلاوة والحموضة، والثلاث الباقية للقوة.",
  },
  {
    credit: "بطل العالم للباريستا 2007",
    name: "Ultimate V60",
    who: "جيمس هوفمان",
    specs: ["٣٠غ بن", "٥٠٠غ ماء", "١٠٠°م", "٣:٣٠"],
    pours: [
      { grams: 60, label: "٦٠غ", color: "#987024" },
      { grams: 240, label: "٢٤٠غ", color: "#536344" },
      { grams: 200, label: "٢٠٠غ", color: "#6b7b58" },
    ],
    tip: "تشريب بضعف وزن البن، وصبتين ثابتة، ودوّرة خفيفة في الآخر.",
  },
];

const faq: [string, string][] = [
  ["التطبيق مجاني؟", "نعم، مجاني وبدون إعلانات."],
  ["لازم أسجّل؟", "لا، تقدر تتصفح كضيف وتسجّل بعدين."],
  ["يشتغل على أندرويد؟", "نعم، على iPhone وعلى Android."],
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

/** Computers: both stores by name, and a code to scan with the phone. */
function DesktopDownload({ from, dark = false }: { from: string; dark?: boolean }) {
  const solid = dark ? "bg-[var(--bg)] text-[var(--ink)]" : "bg-[var(--ink)] text-[var(--bg)]";
  const outline = dark ? "border-[var(--bg)] text-[var(--bg)]" : "border-[var(--ink)] text-[var(--ink)]";
  return (
    <div className="hidden items-center gap-6 md:flex">
      <div className="flex flex-col gap-3">
        <a href={`/get?p=ios&from=${from}`} className={`inline-flex h-[54px] min-w-[240px] items-center justify-center gap-2.5 rounded-full px-7 text-[17px] font-bold transition-opacity hover:opacity-85 ${solid}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M5 21h14" />
          </svg>
          حمّل من App Store
        </a>
        <a href={`/get?p=android&from=${from}`} className={`inline-flex h-[54px] min-w-[240px] items-center justify-center gap-2.5 rounded-full border-[1.5px] px-7 text-[17px] font-bold transition-opacity hover:opacity-75 ${outline}`}>
          <AndroidGlyph size={18} />
          حمّل على Android
        </a>
      </div>
      <div className="flex items-center gap-3 rounded-[22px] bg-[var(--card)] p-3 pe-5 shadow-[0_1px_0_var(--line),0_18px_40px_-28px_rgba(74,52,40,0.45)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/site/qr-get.svg" alt="رمز QR لتحميل BunnList" width={104} height={104} className="h-[104px] w-[104px]" />
        <p className="max-w-[9ch] text-[14px] font-semibold leading-snug text-[var(--ink)]">
          صوّره بجوالك
          <span className="mt-1 block text-[12.5px] font-normal text-[var(--ink-2)]">ويفتح لك التحميل مباشرة</span>
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <main>
        {/* Hero: the promise, the button, the proof, the app. */}
        <section className="relative overflow-hidden bg-[var(--bg)]">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(152,112,36,0.18),transparent)]" />
          <div className="relative mx-auto grid max-w-[1120px] items-center gap-8 px-5 pt-8 md:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:pb-20 lg:pt-16">
            <div className="text-center lg:text-start">
              <p className="hero-in inline-block rounded-full bg-[#f5e7c6] px-3.5 py-1.5 text-[13.5px] font-bold text-[var(--gold)] sm:text-[15px]">
                دليل القهوة المختصة في السعودية
              </p>
              <h1 className="hero-in hero-in-2 mt-4 text-[40px] font-bold leading-[1.1] tracking-tight sm:text-[60px] lg:text-[76px]">
                اعرف وش تشتري،
                <br />
                وحضّرها صح.
              </h1>
              <p className="hero-in hero-in-3 mx-auto mt-4 max-w-[34ch] text-[17px] leading-relaxed text-[var(--ink-2)] sm:text-[21px] lg:mx-0">
                كل محاصيل المحامص السعودية في مكان واحد، بنكهاتها وتقييماتها، ووصفات تمشي معك خطوة بخطوة.
              </p>
              <div className="hero-in hero-in-4 mt-6">
                <div className="md:hidden">
                  <StoreButton from="hero" />
                </div>
                <div className="flex justify-center lg:justify-start">
                  <DesktopDownload from="hero" />
                </div>
                <p className="mt-3 text-[13.5px] text-[var(--ink-2)]">مجاني · بدون إعلانات</p>
              </div>
              <dl className="hero-in hero-in-4 mt-6 flex justify-center gap-7 sm:gap-10 lg:justify-start">
                {stats.map(([n, label]) => (
                  <div key={label} className="text-center lg:text-start">
                    <dt className="sr-only">{label}</dt>
                    <dd>
                      <span className="block text-[26px] font-bold leading-none tracking-tight text-[var(--accent)] sm:text-[34px]" dir="ltr">{n}</span>
                      <span className="mt-1.5 block text-[13px] text-[var(--ink-2)] sm:text-[15px]">{label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="h-[330px] overflow-hidden [perspective:1200px] sm:h-[420px] lg:h-auto lg:overflow-visible">
              <PhoneFrame className="phone-rise">
                <Image src="/site/discover.jpg" alt="شاشة «اكتشف» في تطبيق BunnList" fill sizes="(min-width: 640px) 262px, 242px" quality={92} className="object-cover object-top" priority />
              </PhoneFrame>
            </div>
          </div>
        </section>

        {/* Three benefits, each with its real screen. */}
        <section id="benefits" className="scroll-mt-12 bg-[var(--bg-alt)] px-5 py-12 md:px-8 lg:py-24">
          <div className="mx-auto max-w-[1120px]">
            <Reveal>
              <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[44px] lg:text-center">ثلاث أشياء يسويها لك</h2>
            </Reveal>
            <div className="mt-6 grid gap-4 lg:mt-12 lg:grid-cols-3 lg:gap-6">
              {benefits.map((b, i) => (
                <Reveal
                  as="article"
                  key={b.title}
                  delay={i * 110}
                  className="flex items-center gap-4 overflow-hidden rounded-[26px] bg-[var(--card)] p-3 shadow-[0_1px_0_var(--line)] lg:flex-col lg:items-stretch lg:gap-0 lg:rounded-[32px] lg:p-0"
                >
                  <div className="relative h-[150px] w-[104px] shrink-0 overflow-hidden rounded-[18px] bg-[var(--ink)] p-[4px] lg:order-last lg:mx-auto lg:mt-8 lg:h-[380px] lg:w-[240px] lg:rounded-b-none lg:rounded-t-[38px] lg:p-[8px] lg:pb-0">
                    <div className="relative h-full w-full overflow-hidden rounded-[14px] lg:rounded-b-none lg:rounded-t-[30px]">
                      <Image src={b.image} alt={b.alt} fill sizes="(min-width: 1024px) 224px, 96px" quality={92} className="object-cover object-top" />
                    </div>
                  </div>
                  <div className="min-w-0 lg:px-8 lg:pt-8">
                    <p className="text-[13px] font-bold text-[var(--gold)] lg:text-[15px]">{b.kicker}</p>
                    <h3 className="mt-0.5 text-[21px] font-bold leading-snug lg:text-[28px]">{b.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink-2)] lg:text-[17px]">{b.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={120} className="mt-7 lg:mt-12">
              <p className="text-[15px] font-semibold text-[var(--ink-2)] lg:text-center">وفيه كمان</p>
              <ul className="mt-3 flex flex-wrap gap-2 lg:justify-center">
                {more.map((m) => (
                  <li key={m} className="rounded-full border border-[var(--line)] bg-[var(--card)] px-4 py-2 text-[14.5px] font-medium">{m}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* The champions' recipes. */}
        <section id="champions" className="relative scroll-mt-12 overflow-hidden bg-[var(--dark)] px-5 py-14 text-[var(--bg)] md:px-8 lg:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(200,154,62,0.22),transparent)]" />
          <div className="relative mx-auto max-w-[1120px]">
            <Reveal className="lg:text-center">
              <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[44px]">وصفات أبطال العالم</h2>
              <p className="mt-2 text-[16px] leading-relaxed text-[var(--dark-ink-2)] sm:text-[19px]">بالأوزان والتوقيت، جاهزة تمشي عليها.</p>
            </Reveal>
            <div className="mt-7 grid gap-4 lg:mt-12 lg:grid-cols-2 lg:gap-6">
              {champions.map((c, i) => (
                <Reveal as="article" key={c.name} delay={i * 120} className="rounded-[28px] bg-[var(--dark-2)] p-5 lg:p-8">
                  <p className="text-[13px] font-bold text-[#e2b75c] lg:text-[15px]">{c.who} · {c.credit}</p>
                  <h3 className="mt-1 text-[26px] font-bold lg:text-[34px]">{c.name}</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.specs.map((s) => (
                      <li key={s} className="rounded-full bg-[rgba(247,241,232,0.08)] px-3.5 py-1.5 text-[14px] font-semibold lg:text-[15px]">{s}</li>
                    ))}
                  </ul>
                  <div className="mt-5 flex h-[44px] gap-1.5 lg:h-[52px]" role="img" aria-label={`الصبات: ${c.pours.map((p) => p.label).join("، ")}`}>
                    {c.pours.map((p, j) => (
                      <span key={j} style={{ flexGrow: p.grams, backgroundColor: p.color }} className="flex min-w-0 basis-0 items-center justify-center rounded-[12px] text-[13.5px] font-bold text-white lg:text-[15px]">
                        {p.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-[15px] leading-relaxed text-[var(--dark-ink-2)] lg:text-[16.5px]">{c.tip}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={150} className="mt-7 lg:mt-10 lg:text-center">
              <div className="md:hidden">
                <StoreButton from="champions" tone="gold" />
              </div>
              <a href="/get?from=champions" className="hidden h-[54px] items-center justify-center rounded-full bg-[#e2b75c] px-9 text-[17px] font-bold text-[var(--ink)] transition-opacity hover:opacity-90 md:inline-flex">
                جرّبها في التطبيق
              </a>
            </Reveal>
          </div>
        </section>

        {/* Quick answers. */}
        <section id="faq" className="scroll-mt-12 bg-[var(--bg)] px-5 py-12 md:px-8 lg:py-24">
          <div className="mx-auto max-w-[1120px]">
            <Reveal>
              <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[44px] lg:text-center">أسئلة سريعة</h2>
            </Reveal>
            <dl className="mt-5 grid gap-3 lg:mt-10 lg:grid-cols-3 lg:gap-5">
              {faq.map(([q, a], i) => (
                <Reveal key={q} delay={i * 90} className="rounded-[22px] bg-[var(--card)] px-5 py-4 shadow-[0_1px_0_var(--line)] lg:p-7">
                  <dt className="text-[17px] font-bold lg:text-[20px]">{q}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink-2)] lg:text-[17px]">{a}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* Closing: the button once more. */}
        <section id="download" className="scroll-mt-12 bg-[var(--bg-alt)] px-5 pb-28 pt-14 text-center md:px-8 md:pb-24 lg:py-28">
          <Reveal className="mx-auto max-w-[720px]">
            <Image src="/site/app-icon.png" alt="أيقونة BunnList" width={76} height={76} className="mx-auto rounded-[19px] shadow-[0_12px_30px_rgba(74,52,40,0.2)]" />
            <h2 className="mt-5 text-[34px] font-bold leading-tight tracking-tight sm:text-[52px]">قهوتك الجاية، هنا.</h2>
            <div className="mt-6 md:hidden">
              <StoreButton from="closing" />
            </div>
            <div className="mt-8 flex justify-center">
              <DesktopDownload from="closing" />
            </div>
            <p className="mt-4 text-[14px] text-[var(--ink-2)]">
              <OtherStoreLink from="closing" />
            </p>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
      <StickyDownloadBar />
    </>
  );
}
