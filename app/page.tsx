import Image from "next/image";
import { DownloadButtons, PhoneFrame, SiteFooter, SiteNav } from "@/components/site/Chrome";
import { NewStory } from "@/components/site/Features";
import { BagShelf, BrewClip, Reveal, Steam, Story, type StoryStep } from "@/components/site/Motion";
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
    body: "اختر الطريقة، ووصفة المحمصة أو وصفات أبطال العالم أو وصفتك أنت، ويقترح لك درجة الطحن على مطحنتك، ثم اتبع الخطوات بالثانية.",
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



const methods = ["V60 ساخن", "V60 مثلّج", "إيروبريس", "إسبريسو", "قهوة عربية", "كيمكس", "فرنش برس", "كولد برو"];

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
            اكتشف محاصيل تناسب ذوقك، وإذا احترت نختار لك، وحضّرها خطوة بخطوة.
          </p>
          <div className="hero-in hero-in-4 mt-8 px-5">
            <DownloadButtons />
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

        {/* What's new, told like the story */}
        <NewStory />

        {/* The shelf */}
        <section className="overflow-hidden bg-[var(--bg)] py-20 sm:py-28">
          <Reveal className="mx-auto max-w-[720px] px-5 text-center">
            <h2 className="text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[48px]">رفّ يكبر كل أسبوع.</h2>
            <p className="mt-4 text-[19px] leading-relaxed text-[var(--ink-2)]">
              أكثر من ٧٠٠ محصول من محامص سعودية، بصور أكياسها كما وصلت من محامصها، ويزيد الدليل كل أسبوع.
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
            <p className="mx-auto mt-4 max-w-[40ch] text-[17px] leading-relaxed text-[var(--dark-ink-2)]">
              ومعك وصفات أبطال العالم، مثل 4:6 لتيتسو كاسويا ووصفات بطولة الإيروبريس، وتقدر تكتب وصفتك بخطواتها وحرارة مائها وتحفظها في «وصفاتي».
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

        {/* Closing */}
        <section id="download" className="scroll-mt-12 bg-[var(--bg)] px-5 py-24 text-center sm:py-32">
          <Image src="/site/app-icon.png" alt="" width={72} height={72} className="mx-auto rounded-[18px] shadow-[0_10px_30px_rgba(74,52,40,0.18)]" />
          <h2 className="mx-auto mt-6 max-w-[16ch] text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[56px]">قهوتك الجاية، هنا.</h2>
          <div className="mt-8"><DownloadButtons /></div>
          <p className="mt-4 text-[14px] text-[var(--ink-2)]">iPhone بنظام iOS 17 أو أحدث، وAndroid 8 أو أحدث.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
