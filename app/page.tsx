import Image from "next/image";
import { ComingSoon, PhoneFrame, SiteFooter, SiteNav } from "@/components/site/Chrome";
import { BagShelf, BrewClip, CountUp, Reveal, Steam, Story, type StoryStep } from "@/components/site/Motion";
import { CONTACT_EMAIL } from "@/lib/site";
import { SHELF_LOTS } from "@/lib/site-bags";

// The BunnList site: one page that introduces the app, laid out in Apple's
// manner in BunnList's own colors, with motion that follows the scroll.
// Everything described here is in the app.

const story: StoryStep[] = [
  {
    kicker: "اكتشف",
    title: "ابدأ بما تحبه.",
    body: "لكل محصول صورة كيسه الأصلية، ومنشؤه، وطريقة معالجته، ونكهاته. تصفّح حسب النكهة أو البلد، أو ابحث بالمحمصة والمعالجة.",
    image: "/site/discover.jpg",
    alt: "شاشة «اكتشف»",
  },
  {
    kicker: "احفظ",
    title: "مجموعتك في مكان واحد.",
    body: "ما عندك، وما جرّبته، وما تحبه، وما تنوي تجربته. وصوّر أي كيس فيتعرّف عليه التطبيق ويضيفه.",
    image: "/site/collection.jpg",
    alt: "شاشة «مجموعتي»",
  },
  {
    kicker: "حضّر",
    title: "الوصفة تمشي معك.",
    body: "اختر الطريقة والوصفة، وحدّد درجة الطحن على مطحنتك، ثم اتبع الخطوات بالثانية.",
    image: "/site/brew-v60-poster.jpg",
    alt: "شاشة التحضير",
  },
  {
    kicker: "قيّم",
    title: "والكوب القادم أطيب.",
    body: "قل كيف خرج الطعم، ويقترح التطبيق تعديلًا واحدًا تجرّبه في المرة القادمة، ويتذكّره لك.",
    image: "/site/taste.jpg",
    alt: "شاشة «كيف طلعت؟»",
  },
];



const features: { title: string; body: string; icon: string; wide?: boolean; dark?: boolean }[] = [
  {
    title: "على ذوقك",
    body: "اختر النكهة التي تحبها، من التوت إلى الشوكولاتة، فتظهر محاصيلها أمامك مباشرة.",
    icon: "M12 3c3 3 6 5.5 6 9.5A6 6 0 0 1 6 12.5C6 8.5 9 6 12 3Z",
  },
  {
    title: "صوّر الكيس",
    body: "وجّه الكاميرا إلى كيس القهوة، ويتعرّف عليه التطبيق ويضيفه إلى مجموعتك.",
    icon: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  },
  {
    title: "كوبك القادم أفضل",
    body: "خرجت القهوة حامضة أو مُرّة أو خفيفة؟ أخبر التطبيق بالطعم، فيقترح عليك تعديلًا واحدًا تجرّبه في المرة القادمة.",
    icon: "M5 19 19 5M15 5h4v4M7 13l-2 2 4 4 2-2",
    wide: true,
  },
  {
    title: "دليل المطاحن",
    body: "١٢٣ مطحنة من مختلف الفئات، منها ٩١ بمواصفات موثّقة من مصادرها. اختر مطحنتك، فيقرّب لك التطبيق درجة الطحن المناسبة.",
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
    dark: true,
  },
  {
    title: "جواز القهوة",
    body: "مع كل بلد تتذوّق قهوته يُضاف ختم جديد إلى جوازك، وتكتمل شاراتك مع الوقت.",
    icon: "M6 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6V3Zm4 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0m-1 6h6",
  },
  {
    title: "مجموعتي",
    body: "ما عندك، وما جرّبته، وما تحبه، وما تنوي تجربته. كلٌّ في رفّه.",
    icon: "M4 8l8-4 8 4-8 4-8-4Zm0 4 8 4 8-4M4 16l8 4 8-4",
  },
  {
    title: "الوصفات",
    body: "دوّن وصفتك بخطواتها وأوزانها، وشاركها مع غيرك، أو انطلق من وصفة أعجبتك وعدّلها.",
    icon: "M6 4h9l3 3v13H6V4Zm3 6h6M9 14h6",
  },
  {
    title: "مجتمع القهوة",
    body: "تعرّف على أكثر القهوات تحضيرًا هذا الأسبوع، وتابع جديد من تتابعهم، ونافس على الصدارة.",
    icon: "M4 17l5-5 4 3 7-7M15 8h5v5",
    wide: true,
  },
  {
    title: "خصوصيتك لك",
    body: "تجاربك خاصة ما لم تنشرها، وأنت من يحدد من يرى نشاطك. ويمكنك حذف حسابك متى شئت.",
    icon: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4",
  },
  {
    title: "أيقونة لكل مناسبة",
    body: "تتبدّل أيقونة التطبيق في رمضان والعيدين ويوم التأسيس واليوم الوطني.",
    icon: "M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z",
  },
];

const methods = ["V60 ساخن", "V60 مثلّج", "إيروبريس", "إسبريسو", "قهوة عربية", "كيمكس", "فرنش برس", "كولد برو"];

const specs: [string, string][] = [
  ["التوافق", "iPhone بنظام iOS 17 أو أحدث"],
  ["اللغة", "العربية"],
  ["الحساب", "الدخول عبر Apple أو Google أو برمز يصل إلى بريدك. ويمكنك التصفّح دون حساب."],
  ["طرق التحضير", "V60 الساخن والمثلّج، وكيمكس، وإيروبريس، وفرنش برس، وإسبريسو، وكولد برو، والقهوة العربية."],
  ["التحضير خطوة بخطوة", "رسوم متحركة لـ V60 وإيروبريس والإسبريسو والقهوة العربية، ومؤقّت يتبع خطوات وصفتك، وتنبيه بالاهتزاز قبل كل خطوة، مع إبقاء الشاشة مضاءة."],
  ["الدليل", "محاصيل من محامص سعودية بصور أكياسها الأصلية، مع المنشأ والمعالجة والنكهات."],
  ["البحث والتصفية", "حسب المنشأ والمحمصة والمعالجة وطريقة التحضير ونوع النكهة، والقهوة منزوعة الكافيين، وما في مجموعتك."],
  ["سجلّ التحضير", "الوصفة، والمطحنة ودرجة الطحن، والأوزان، والوقت، والطعم، مع اقتراح للمرة القادمة."],
  ["دليل المطاحن", "١٢٣ مطحنة، منها ٩١ بمواصفات ومصادر، مع تحويل تقريبي لدرجات الطحن."],
  ["الإشعارات", "المتابعون الجدد، والإعجابات، وملخّص أسبوعي، وتذكير يومي، وكلها قابلة للإيقاف."],
  ["المظهر", "فاتح أو داكن أو تلقائي، مع أيقونات خاصة بالمناسبات."],
  ["إمكانية الوصول", "يدعم VoiceOver والخطوط الكبيرة (Dynamic Type)."],
  ["الخصوصية", "تتحكّم في من يرى نشاطك ومتابعيك، ويمكنك الاختفاء من قوائم الصدارة وحذف حسابك من داخل التطبيق."],
  ["التوفّر", "قريبًا على App Store"],
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        {/* Hero */}
        <section className="overflow-hidden bg-[var(--bg)] pt-14 text-center sm:pt-20">
          <div className="hero-in relative mx-auto mt-12 w-fit">
            <Steam />
            <Image src="/site/app-icon.png" alt="أيقونة BunnList" width={88} height={88} priority className="rounded-[22px] shadow-[0_10px_30px_rgba(74,52,40,0.18)]" />
          </div>
          <p className="hero-in hero-in-2 mt-6 text-[21px] font-semibold text-[var(--gold)] sm:text-[24px]">BunnList</p>
          <h1 className="hero-in hero-in-2 mx-auto mt-2 max-w-[14ch] px-4 text-[44px] font-bold leading-[1.1] tracking-tight sm:text-[72px] lg:text-[88px]">
            قهوتك الجاية، هنا.
          </h1>
          <p className="hero-in hero-in-3 mx-auto mt-5 max-w-[32ch] px-5 text-[19px] leading-relaxed text-[var(--ink-2)] sm:text-[24px]">
            اكتشف محاصيل تناسب ذوقك، وحضّرها خطوة بخطوة، واجعل كل كوب أطيب من سابقه.
          </p>
          <div className="hero-in hero-in-4 mt-8">
            <ComingSoon />
          </div>
          <div className="relative mx-auto mt-14 h-[420px] max-w-[1024px] [perspective:1200px] sm:h-[560px]">
            <PhoneFrame className="phone-rise absolute inset-x-0 top-0">
              <Image src="/site/discover.jpg" alt="شاشة «اكتشف» في التطبيق" fill sizes="300px" className="object-cover object-top" priority />
            </PhoneFrame>
          </div>
        </section>

        {/* The story: discover, keep, brew, rate */}
        <section id="discover" className="scroll-mt-12 bg-[var(--bg-alt)] px-5 py-10 sm:py-16">
          <Story steps={story} />
        </section>

        {/* The shelf */}
        <section className="overflow-hidden bg-[var(--bg)] py-20 sm:py-28">
          <Reveal className="mx-auto max-w-[720px] px-5 text-center">
            <h2 className="text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[48px]">رفّ يكبر كل أسبوع.</h2>
            <p className="mt-4 text-[19px] leading-relaxed text-[var(--ink-2)]">
              محاصيل من محامص سعودية، بصور أكياسها كما وصلت من محامصها. هذه من بلاك نايت.
            </p>
          </Reveal>
          <div className="mt-12">
            <BagShelf lots={SHELF_LOTS} />
          </div>
        </section>

        {/* Brew, in motion */}
        <section id="brew" className="relative scroll-mt-12 overflow-hidden bg-[var(--dark)] px-5 py-20 text-[var(--bg)] sm:py-28">
          <Reveal className="mx-auto max-w-[1024px] text-center">
            <p className="text-[17px] font-semibold text-[var(--gold-light)]">حضّر</p>
            <h2 className="mx-auto mt-2 max-w-[16ch] text-[40px] font-bold leading-[1.1] tracking-tight sm:text-[64px]">
              كل خطوة أمام عينيك.
            </h2>
            <p className="mx-auto mt-5 max-w-[40ch] text-[19px] leading-relaxed text-[var(--dark-ink-2)] sm:text-[21px]">
              ترى الماء ينساب، والبن ينتفخ، والإبريق يمتلئ، في توقيت وصفتك نفسه. وقبل كل خطوة بثلاث ثوانٍ يهتزّ هاتفك
              اهتزازة خفيفة لتنتبه في الوقت المناسب.
            </p>
          </Reveal>
          <div className="mt-14">
            <BrewClip />
          </div>
          <div className="mx-auto mt-16 flex max-w-[1024px] flex-wrap justify-center gap-2">
            {methods.map((m) => (
              <span key={m} className="rounded-full border border-[rgba(200,154,62,0.35)] px-4 py-2 text-[14px] text-[rgba(247,241,232,0.85)]">{m}</span>
            ))}
          </div>
        </section>

        {/* Features, as a bento grid */}
        <section id="features" className="scroll-mt-12 bg-[var(--bg-alt)] px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-[1024px]">
            <Reveal>
              <h2 className="text-center text-[34px] font-bold tracking-tight sm:text-[48px]">من الحبّة إلى الفنجال.</h2>
            </Reveal>
            <Reveal delay={100} className="mx-auto mt-10 grid max-w-[720px] grid-cols-3 gap-4 text-center">
              {([[123, "مطحنة في الدليل"], [91, "بمواصفات موثّقة"], [7, "طرق تحضير"]] as const).map(([n, label]) => (
                <div key={label}>
                  <p className="text-[40px] font-bold tracking-tight text-[var(--accent)] sm:text-[56px]"><CountUp to={n} /></p>
                  <p className="text-[15px] text-[var(--ink-2)]">{label}</p>
                </div>
              ))}
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <Reveal
                  as="article"
                  key={f.title}
                  delay={(i % 4) * 90}
                  className={`flex min-h-[220px] flex-col justify-between rounded-[28px] p-7 transition-transform duration-300 hover:-translate-y-1 ${f.wide ? "lg:col-span-2" : ""} ${
                    f.dark ? "bg-[var(--dark)] text-[var(--bg)]" : "bg-[var(--card)] shadow-[0_1px_0_var(--line)]"
                  }`}
                >
                  <span className={`pop inline-block w-fit ${f.dark ? "text-[var(--gold-light)]" : "text-[var(--accent)]"}`}>
                    <Icon d={f.icon} />
                  </span>
                  <div>
                    <h3 className="mt-8 text-[24px] font-semibold tracking-tight">{f.title}</h3>
                    <p className={`mt-2 text-[16px] leading-relaxed ${f.dark ? "text-[var(--dark-ink-2)]" : "text-[var(--ink-2)]"}`}>{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Specs */}
        <section id="specs" className="scroll-mt-12 bg-[var(--bg)] px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-[880px]">
            <Reveal><h2 className="text-[34px] font-bold tracking-tight sm:text-[48px]">المواصفات</h2></Reveal>
            <dl className="mt-10 border-t border-[var(--line)]">
              {specs.map(([k, v]) => (
                <div key={k} className="grid gap-1 border-b border-[var(--line)] py-5 sm:grid-cols-[200px_1fr] sm:gap-8">
                  <dt className="text-[17px] font-semibold">{k}</dt>
                  <dd className="text-[17px] leading-relaxed text-[var(--ink-2)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Roasters */}
        <section id="roasters" className="scroll-mt-12 bg-[var(--bg-alt)] px-5 py-20 text-center sm:py-28">
          <Reveal className="mx-auto max-w-[720px]">
            <p className="text-[17px] font-semibold text-[var(--accent)]">للمحامص</p>
            <h2 className="mt-2 text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[48px]">محاصيلكم كما قدّمتموها.</h2>
            <p className="mt-5 text-[19px] leading-relaxed text-[var(--ink-2)]">
              نعرض صور أكياسكم دون أي تعديل على العبوة أو الشعار، واسم محمصتكم ظاهر عليها. يسعدنا أن تزوّدونا بصور أوضح أو
              معلومات أدق، ولكم أن تطلبوا تعديل أي محتوى أو حذفه متى شئتم.
            </p>
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("محمصة في BunnList")}`} className="mt-8 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-[17px] font-medium text-[var(--bg)] transition hover:bg-[var(--accent-ink)]">
              راسلونا
            </a>
          </Reveal>
        </section>

        {/* Closing */}
        <section className="bg-[var(--bg)] px-5 py-24 text-center sm:py-32">
          <Image src="/site/app-icon.png" alt="" width={72} height={72} className="mx-auto rounded-[18px] shadow-[0_10px_30px_rgba(74,52,40,0.18)]" />
          <h2 className="mx-auto mt-6 max-w-[16ch] text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[56px]">قهوتك الجاية، هنا.</h2>
          <div className="mt-8"><ComingSoon /></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
