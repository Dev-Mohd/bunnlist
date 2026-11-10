import Image from "next/image";
import { AndroidGlyph, PhoneFrame, SiteFooter, SiteNav } from "@/components/site/Chrome";
import { OtherStoreLink, StickyDownloadBar, StoreButton } from "@/components/site/Download";
import { Reveal } from "@/components/site/Motion";
import { SITE_URL } from "@/lib/site";
import { lotByFile } from "@/lib/site-bags";

// The BunnList site: one page whose job is the download, laid out a chapter at a time.
// Each chapter is a full-width band with one idea: a small label, one large line, one
// sentence, and the app (or a drawing of it) big enough to read. Every button goes
// through /get, which sends the visitor to the right store for their phone. Everything
// described is in the app.

const stats: [string, string][] = [
  ["+700", "محصول"],
  ["+40", "محمصة سعودية"],
  ["123", "مطحنة في الدليل"],
];

// The roasters' own marks, as the app shows them.
const roasters = [
  "kiffa", "camel-step", "sulalat", "soil-roastery", "roasting-house", "oro-roastery", "process-coffee-roasters", "bunista",
  "black-knight", "ash", "kof", "october", "oden", "qaf-roastery", "sawt-roastery", "shovel", "yoof", "12-cups", "batch", "asante-roastery",
];

// Real coffees from the guide, as published in the app, with the roasters' own bag photos.
const bags = ["kof-ethiopia-shakiso", "camel-step-colombia-descanso", "ash-grape-colombia", "bunista-peru-valle-dorado"].map((file) => {
  const lot = lotByFile(file);
  return { src: `/site/bags/${file}.jpg`, name: lot.name, origin: [lot.origin, lot.process].filter(Boolean).join(" · "), notes: lot.notes.slice(0, 2).join(" · ") };
});

const bento: { title: string; body: string; big?: string; wide?: boolean; dark?: boolean }[] = [
  { big: "123", title: "مطحنة في الدليل", body: "اختر مطحنتك، ونعطيك الطحنة بالكليك لكل وصفة.", wide: true },
  { title: "صوّر الكيس", body: "وجّه الكاميرا على الكيس، ونتعرّف على القهوة ونضيفها لمجموعتك.", dark: true },
  { title: "مشروبات الحليب", body: "كورتادو، فلات وايت، كابتشينو ولاتيه. كل واحد بكمية حليبه وطريقة تبخيره." },
  { title: "خريطة مناطق القهوة", body: "من إثيوبيا إلى كولومبيا: وش ذقت، ووش باقي عليك." },
  { title: "تحدي كل أسبوع", body: "تحدي جديد ونقاط ومتصدرين، مع ناس تحب القهوة مثلك.", dark: true },
];

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

/** One of the timer's glance screens, drawn as the app draws it. */
function GlancePhone({ tone, label, value, unit, foot }: { tone: "gold" | "dark"; label: string; value: string; unit: string; foot?: string }) {
  const gold = tone === "gold";
  return (
    <div className="relative aspect-[393/852] w-[150px] rounded-[30px] bg-black p-[6px] shadow-[0_30px_80px_rgba(0,0,0,0.5)] sm:w-[220px] sm:rounded-[40px] sm:p-[8px] lg:w-[260px] lg:rounded-[46px] lg:p-[9px]">
      <div className={`flex h-full w-full flex-col items-center justify-center rounded-[24px] text-center sm:rounded-[32px] lg:rounded-[38px] ${gold ? "bg-[#c79a3d] text-black" : "bg-[#171411] text-white"}`}>
        <p className="text-[15px] font-bold sm:text-[22px] lg:text-[26px]">{label}</p>
        <p className="text-[64px] font-black leading-none tracking-tight sm:text-[96px] lg:text-[116px]" dir="ltr">{value}</p>
        <p className="mt-1 text-[11px] font-bold opacity-70 sm:text-[15px] lg:text-[17px]">{unit}</p>
        {foot ? <p className="mt-3 font-mono text-[13px] font-bold sm:text-[20px] lg:text-[24px]" dir="ltr">{foot}</p> : null}
      </div>
    </div>
  );
}

const kicker = "text-[15px] font-bold text-[var(--gold)] sm:text-[19px]";
const headline = "mt-2 text-[38px] font-bold leading-[1.08] tracking-tight sm:text-[60px] lg:text-[80px]";
const lede = "mx-auto mt-4 max-w-[32ch] text-[18px] leading-relaxed sm:text-[23px]";

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <main>
        {/* Hero: the promise and the button, then the app itself, large. */}
        <section className="relative overflow-hidden bg-[var(--bg)] px-5 pt-12 text-center md:px-8 lg:pt-24">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[38%] h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(152,112,36,0.2),transparent)]" />
          <div className="relative mx-auto max-w-[980px]">
            <p className={`hero-in ${kicker}`}>دليل القهوة المختصة في السعودية</p>
            <h1 className="hero-in hero-in-2 mt-3 text-[46px] font-bold leading-[1.05] tracking-tight sm:text-[76px] lg:text-[104px]">
              اعرف وش تشتري.
              <br />
              وحضّرها صح.
            </h1>
            <p className={`hero-in hero-in-3 text-[var(--ink-2)] ${lede}`}>
              كل محاصيل المحامص السعودية في مكان واحد، ووصفات تمشي معك خطوة بخطوة.
            </p>
            <div className="hero-in hero-in-4 mt-7">
              <div className="md:hidden">
                <StoreButton from="hero" />
              </div>
              <div className="flex justify-center">
                <DesktopDownload from="hero" />
              </div>
              <p className="mt-3 text-[14px] text-[var(--ink-2)] sm:text-[15px]">مجاني · بدون إعلانات · بدون تسجيل</p>
            </div>
            <div className="mt-10 h-[420px] overflow-hidden [perspective:1200px] sm:h-[520px] lg:mt-16 lg:h-[620px]">
              <PhoneFrame className="phone-rise !w-[280px] sm:!w-[320px] lg:!w-[360px]">
                <Image src="/site/discover.jpg" alt="شاشة «اكتشف» في تطبيق BunnList" fill sizes="(min-width: 1024px) 342px, 302px" quality={92} className="object-cover object-top" priority />
              </PhoneFrame>
            </div>
          </div>
        </section>

        {/* The numbers, large, and the roasters by their own marks. */}
        <section className="border-y border-[var(--line)] bg-[var(--card)] py-12 lg:py-20">
          <dl className="mx-auto flex max-w-[980px] justify-center gap-8 px-5 sm:gap-20">
            {stats.map(([n, label]) => (
              <Reveal key={label} className="text-center">
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block text-[40px] font-bold leading-none tracking-tight sm:text-[72px] lg:text-[88px]" dir="ltr">{n}</span>
                  <span className="mt-2 block text-[14px] text-[var(--ink-2)] sm:text-[19px]">{label}</span>
                </dd>
              </Reveal>
            ))}
          </dl>
          <div className="shelf mt-10 overflow-hidden lg:mt-14" dir="ltr" aria-label="من المحامص اللي في الدليل">
            <div className="flex w-max gap-4 pe-4" style={{ animation: "shelf 60s linear infinite" }}>
              {[...roasters, ...roasters].map((slug, i) => (
                <div key={i} className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[20px] bg-[var(--bg)] p-2.5 sm:h-[88px] sm:w-[88px] sm:rounded-[24px]" aria-hidden={i >= roasters.length}>
                  <Image src={`/roasters/${slug}.png`} alt="" width={72} height={72} className="h-full w-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chapter one: discover. */}
        <section id="benefits" className="scroll-mt-12 overflow-hidden bg-[var(--bg)] px-5 py-20 text-center md:px-8 lg:py-36">
          <Reveal className="mx-auto max-w-[980px]">
            <p className={kicker}>اكتشف</p>
            <h2 className={headline}>
              كل محصول،
              <br />
              ببطاقته كاملة.
            </h2>
            <p className={`text-[var(--ink-2)] ${lede}`}>النكهات، المنشأ، المعالجة، وتقييم الناس اللي ذاقوها. قارن قبل لا تدفع.</p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-[1120px] items-center gap-4 lg:mt-20 lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
            <div className="order-2 grid grid-cols-2 gap-4 lg:order-1 lg:grid-cols-1 lg:gap-6">
              {bags.slice(0, 2).map((b, i) => <BagCard key={b.src} bag={b} delay={i * 120} />)}
            </div>
            <Reveal className="order-1 lg:order-2">
              <PhoneFrame className="!w-[270px] sm:!w-[300px] lg:!w-[330px]">
                <Image src="/site/collection.jpg" alt="شاشة المجموعة في التطبيق" fill sizes="(min-width: 1024px) 312px, 282px" quality={92} className="object-cover object-top" />
              </PhoneFrame>
            </Reveal>
            <div className="order-3 grid grid-cols-2 gap-4 lg:grid-cols-1 lg:gap-6">
              {bags.slice(2, 4).map((b, i) => <BagCard key={b.src} bag={b} delay={i * 120 + 100} />)}
            </div>
          </div>
        </section>

        {/* Chapter two: brew, hands-free. */}
        <section className="relative overflow-hidden bg-black px-5 py-20 text-center text-white md:px-8 lg:py-36">
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/2 h-[560px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(199,154,61,0.28),transparent)]" />
          <Reveal className="relative mx-auto max-w-[980px]">
            <p className="text-[15px] font-bold text-[#e2b75c] sm:text-[19px]">حضّر</p>
            <h2 className={headline}>
              عينك على الكوب.
              <br />
              مو على الجوال.
            </h2>
            <p className={`text-white/70 ${lede}`}>التطبيق يقول لك كل خطوة بالصوت ويعدّ لك قبل اللي بعدها. والشاشة رقم واحد ينقرا من آخر المطبخ.</p>
          </Reveal>
          <Reveal delay={120} className="relative mx-auto mt-10 flex max-w-[980px] flex-wrap justify-center gap-2.5 lg:mt-14">
            {["«صبّ لين 150 غرام»", "«ثلاثة… اثنين… واحد»", "«انتظر 30 ثانية»", "«خلصت، بالعافية»"].map((line) => (
              <span key={line} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[15px] font-semibold sm:px-5 sm:py-2.5 sm:text-[18px]">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#e2b75c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
                </svg>
                {line}
              </span>
            ))}
          </Reveal>
          <div className="relative mx-auto mt-10 flex max-w-[980px] items-end justify-center gap-4 sm:gap-8 lg:mt-16">
            <Reveal><GlancePhone tone="gold" label="صبّ لين" value="150" unit="غرام على الميزان" foot="0:24" /></Reveal>
            <Reveal delay={150}><GlancePhone tone="dark" label="انتظر" value="30" unit="ثانية باقية" /></Reveal>
          </div>
          <Reveal delay={200} className="relative mt-8 text-[15px] text-white/60 sm:text-[17px]">ذهبي يعني صبّ. غامق يعني انتظر.</Reveal>
        </section>

        {/* Chapter three: the advisor. */}
        <section className="overflow-hidden bg-[var(--bg-alt)] px-5 py-20 text-center md:px-8 lg:py-36">
          <Reveal className="mx-auto max-w-[980px]">
            <p className={kicker}>ساعدني أختار</p>
            <h2 className={headline}>
              محتار؟
              <br />
              أربع أسئلة وبس.
            </h2>
            <p className={`text-[var(--ink-2)] ${lede}`}>قل لنا كيف تحب قهوتك، ونطلع لك ثلاث قهاوي على ذوقك من المحامص السعودية.</p>
          </Reveal>
          <Reveal delay={120} className="mx-auto mt-10 flex max-w-[760px] flex-wrap justify-center gap-2.5 lg:mt-14">
            {[["حارة", true], ["باردة", false], ["سادة", true], ["مع حليب", false], ["فواكه", true], ["شوكولاتة ومكسرات", false], ["V60", true], ["اسبريسو", false]].map(([label, on]) => (
              <span key={label as string} className={`rounded-full px-5 py-2.5 text-[16px] font-bold sm:text-[19px] ${on ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-[var(--card)] text-[var(--ink)] shadow-[0_1px_0_var(--line)]"}`}>
                {label as string}
              </span>
            ))}
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-[760px] grid-cols-3 gap-3 sm:gap-5 lg:mt-14">
            {[bags[0], bags[2], bags[1]].map((b, i) => (
              <Reveal key={b.src} delay={i * 120} className="overflow-hidden rounded-[22px] bg-[var(--card)] p-2 shadow-[0_1px_0_var(--line),0_24px_50px_-34px_rgba(74,52,40,0.5)] sm:rounded-[30px] sm:p-3">
                <div className="relative aspect-square overflow-hidden rounded-[16px] bg-white sm:rounded-[22px]">
                  <Image src={b.src} alt={b.name} fill sizes="(min-width: 640px) 220px, 30vw" className="object-contain" />
                </div>
                <p className="mt-2 truncate text-[13px] font-bold sm:text-[17px]">{b.name}</p>
                <p className="truncate pb-1 text-[11px] text-[var(--ink-2)] sm:text-[14px]">{b.notes}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* And the rest, as tiles. */}
        <section className="bg-[var(--bg)] px-5 py-20 md:px-8 lg:py-32">
          <div className="mx-auto max-w-[1120px]">
            <Reveal className="text-center">
              <h2 className="text-[34px] font-bold leading-tight tracking-tight sm:text-[52px] lg:text-[64px]">وفيه أكثر.</h2>
            </Reveal>
            <div className="mt-8 grid gap-4 lg:mt-14 lg:grid-cols-3 lg:gap-5">
              {bento.map((t, i) => (
                <Reveal
                  as="article"
                  key={t.title}
                  delay={(i % 3) * 100}
                  className={`flex min-h-[200px] flex-col justify-end rounded-[30px] p-7 lg:min-h-[280px] lg:rounded-[36px] lg:p-10 ${t.wide ? "lg:col-span-2" : ""} ${t.dark ? "bg-[var(--dark)] text-[var(--bg)]" : "bg-[var(--card)] shadow-[0_1px_0_var(--line)]"}`}
                >
                  {t.big ? <p className="text-[72px] font-bold leading-none tracking-tight text-[var(--accent)] lg:text-[120px]" dir="ltr">{t.big}</p> : null}
                  <h3 className="mt-2 text-[26px] font-bold leading-tight lg:text-[36px]">{t.title}</h3>
                  <p className={`mt-2 max-w-[34ch] text-[16px] leading-relaxed lg:text-[19px] ${t.dark ? "text-[var(--dark-ink-2)]" : "text-[var(--ink-2)]"}`}>{t.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* The champions' recipes. */}
        <section id="champions" className="relative scroll-mt-12 overflow-hidden bg-[var(--dark)] px-5 py-20 text-[var(--bg)] md:px-8 lg:py-36">
          <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(200,154,62,0.22),transparent)]" />
          <div className="relative mx-auto max-w-[1120px]">
            <Reveal className="text-center">
              <p className="text-[15px] font-bold text-[#e2b75c] sm:text-[19px]">الوصفات</p>
              <h2 className={headline}>
                حضّر مثل
                <br />
                أبطال العالم.
              </h2>
              <p className={`text-[var(--dark-ink-2)] ${lede}`}>وصفاتهم بالأوزان والتوقيت، مضبوطة على كمية قهوتك.</p>
            </Reveal>
            <div className="mt-10 grid gap-4 lg:mt-16 lg:grid-cols-2 lg:gap-6">
              {champions.map((c, i) => (
                <Reveal as="article" key={c.name} delay={i * 120} className="rounded-[30px] bg-[var(--dark-2)] p-6 lg:rounded-[36px] lg:p-10">
                  <p className="text-[13px] font-bold text-[#e2b75c] lg:text-[15px]">{c.who} · {c.credit}</p>
                  <h3 className="mt-1 text-[28px] font-bold lg:text-[40px]">{c.name}</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.specs.map((s) => (
                      <li key={s} className="rounded-full bg-[rgba(247,241,232,0.08)] px-3.5 py-1.5 text-[14px] font-semibold lg:text-[15px]">{s}</li>
                    ))}
                  </ul>
                  <div className="mt-5 flex h-[44px] gap-1.5 lg:h-[56px]" role="img" aria-label={`الصبات: ${c.pours.map((p) => p.label).join("، ")}`}>
                    {c.pours.map((p, j) => (
                      <span key={j} style={{ flexGrow: p.grams, backgroundColor: p.color }} className="flex min-w-0 basis-0 items-center justify-center rounded-[12px] text-[13.5px] font-bold text-white lg:text-[15px]">
                        {p.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-[15px] leading-relaxed text-[var(--dark-ink-2)] lg:text-[17px]">{c.tip}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={150} className="mt-8 text-center lg:mt-12">
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
        <section id="faq" className="scroll-mt-12 bg-[var(--bg)] px-5 py-20 md:px-8 lg:py-32">
          <div className="mx-auto max-w-[780px]">
            <Reveal className="text-center">
              <h2 className="text-[34px] font-bold leading-tight tracking-tight sm:text-[52px] lg:text-[64px]">أسئلة سريعة</h2>
            </Reveal>
            <Reveal delay={100} className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)] lg:mt-12">
              {faq.map(([q, a], i) => (
                <details key={q} className="group" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[19px] font-bold lg:py-6 lg:text-[24px] [&::-webkit-details-marker]:hidden">
                    {q}
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-[var(--ink-2)] transition-transform duration-300 group-open:rotate-45">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  <p className="pb-6 text-[16.5px] leading-relaxed text-[var(--ink-2)] lg:text-[19px]">{a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Closing: the button once more. */}
        <section id="download" className="scroll-mt-12 bg-[var(--bg-alt)] px-5 pb-32 pt-20 text-center md:px-8 md:pb-28 lg:py-40">
          <Reveal className="mx-auto max-w-[860px]">
            <Image src="/site/app-icon.png" alt="أيقونة BunnList" width={96} height={96} className="mx-auto rounded-[24px] shadow-[0_16px_40px_rgba(74,52,40,0.22)]" />
            <h2 className="mt-7 text-[44px] font-bold leading-[1.05] tracking-tight sm:text-[72px] lg:text-[96px]">قهوتك الجاية، هنا.</h2>
            <p className={`text-[var(--ink-2)] ${lede}`}>مجاني، بدون إعلانات، وتبدأ بدون تسجيل.</p>
            <div className="mt-8 md:hidden">
              <StoreButton from="closing" />
            </div>
            <div className="mt-10 flex justify-center">
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

/** A coffee as its roaster photographed it, with its name and notes. */
function BagCard({ bag, delay }: { bag: (typeof bags)[number]; delay: number }) {
  return (
    <Reveal delay={delay} className="rounded-[26px] bg-[var(--card)] p-3 text-start shadow-[0_1px_0_var(--line),0_24px_50px_-34px_rgba(74,52,40,0.5)] lg:rounded-[32px] lg:p-4">
      <div className="relative aspect-square overflow-hidden rounded-[18px] bg-white lg:rounded-[22px]">
        <Image src={bag.src} alt={bag.name} fill sizes="(min-width: 1024px) 260px, 45vw" className="object-contain" />
      </div>
      <p className="mt-3 truncate px-1 text-[16px] font-bold lg:text-[20px]">{bag.name}</p>
      <p className="truncate px-1 text-[13px] text-[var(--ink-2)] lg:text-[15px]">{bag.origin}</p>
      <p className="mt-1.5 inline-block rounded-full bg-[var(--bg-alt)] px-3 py-1 text-[12.5px] font-semibold lg:text-[14px]">{bag.notes}</p>
    </Reveal>
  );
}
