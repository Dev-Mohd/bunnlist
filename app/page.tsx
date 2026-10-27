import Image from "next/image";
import { ComingSoon, PhoneFrame, SiteFooter, SiteNav } from "@/components/site/Chrome";
import { CONTACT_EMAIL } from "@/lib/site";

// The BunnList site: one page that introduces the app, in Apple's manner.
// Everything described here is in the app; nothing is sold or signed into here.

const features: { title: string; body: string; icon: string; wide?: boolean; dark?: boolean }[] = [
  {
    title: "حسب ذوقك",
    body: "اختر نكهة (توت، شوكولاتة، زهري…) وتطلع لك محاصيلها في نفس المكان.",
    icon: "M12 3c3 3 6 5.5 6 9.5A6 6 0 0 1 6 12.5C6 8.5 9 6 12 3Z",
  },
  {
    title: "امسح الكيس",
    body: "صوّر كيس القهوة، والتطبيق يتعرّف عليه ويضيفه لمجموعتك أو يقترحه للدليل.",
    icon: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  },
  {
    title: "مساعد الطعم",
    body: "حامضة؟ مرّة؟ خفيفة؟ قل كيف طلعت، ويقترح عليك تغيير واحد بس للمرة الجاية.",
    icon: "M5 19 19 5M15 5h4v4M7 13l-2 2 4 4 2-2",
    wide: true,
  },
  {
    title: "دليل المطاحن",
    body: "١٢٣ مطحنة من الرخيصة للغالية، منها ٩١ بمواصفات موثّقة من مصادرها. اختر مطحنتك ويقرّب لك رقم الطحنة.",
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
    dark: true,
  },
  {
    title: "جواز القهوة",
    body: "كل بلد تجرّب قهوته ينختم في جوازك، ومع الأختام شارات تكبر معك.",
    icon: "M6 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6V3Zm4 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0m-1 6h6",
  },
  {
    title: "مجموعتي",
    body: "لديّ، جرّبته، مفضّل، ودّي أجرّب. كل قهوة في مكانها، وتلقاها أول ما تحضّر.",
    icon: "M4 8l8-4 8 4-8 4-8-4Zm0 4 8 4 8-4M4 16l8 4 8-4",
  },
  {
    title: "الوصفات",
    body: "اكتب وصفتك بخطواتها وأوزانها، انشرها للمجتمع، أو انسخ وصفة أعجبتك وعدّل عليها.",
    icon: "M6 4h9l3 3v13H6V4Zm3 6h6M9 14h6",
  },
  {
    title: "المجتمع والترند",
    body: "وش يحضّر الناس هالأسبوع، نبض المجتمع، المتصدرين، النقاط والتحديات، والمتابعة.",
    icon: "M4 17l5-5 4 3 7-7M15 8h5v5",
    wide: true,
  },
  {
    title: "خصوصيتك بيدك",
    body: "تحدد مين يشوف نشاطك، وتجاربك خاصة إلا إذا نشرتها، وتحذف حسابك متى ما بغيت.",
    icon: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4",
  },
  {
    title: "أيقونة لكل مناسبة",
    body: "رمضان، والعيدين، ويوم التأسيس، واليوم الوطني. ومظهر فاتح وداكن.",
    icon: "M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z",
  },
];

const methods = ["V60 حار", "V60 مثلّج", "إيروبريس", "إسبريسو", "قهوة عربية", "كيمكس", "فرنش برس", "كولد برو"];

const specs: [string, string][] = [
  ["التوافق", "iPhone بنظام iOS 17 أو أحدث"],
  ["اللغة", "العربية"],
  ["الحساب", "تسجيل بـ Apple أو Google أو رمز على البريد، والتصفح متاح بدون حساب"],
  ["طرق التحضير", "V60 (حار ومثلّج)، كيمكس، إيروبريس، فرنش برس، إسبريسو، كولد برو، قهوة عربية"],
  ["التحضير بالحركة", "V60 حار ومثلّج، إيروبريس، إسبريسو، قهوة عربية · مؤقّت بخطوات الوصفة، اهتزاز قبل كل خطوة، والشاشة تبقى مضاءة"],
  ["الدليل", "محاصيل محامص سعودية بصور أكياسها الأصلية، مع المنشأ والمعالجة والنكهات"],
  ["البحث والفلاتر", "المنشأ، المحمصة، المعالجة، طريقة التحضير، عائلة النكهة، منزوعة الكافيين، وما عندي منها"],
  ["سجل التحضير", "الوصفة، المطحنة ورقم الطحنة، الأوزان، الوقت، والطعم، مع اقتراح للمرة الجاية"],
  ["دليل المطاحن", "١٢٣ مطحنة، ٩١ منها بمواصفات ومصادر، وتحويل تقريبي للطحنة"],
  ["الإشعارات", "إعجابات ومتابعات، ملخص أسبوعي، وتذكير بالسلسلة اليومية، وكلها قابلة للإيقاف"],
  ["المظهر", "فاتح، داكن، أو حسب الجهاز · أيقونات خاصة لرمضان والعيدين ويوم التأسيس واليوم الوطني"],
  ["إمكانية الوصول", "VoiceOver وأحجام الخط الكبيرة (Dynamic Type)"],
  ["الخصوصية", "تحدد مين يشوف نشاطك ومتابعيك، تقدر تختفي من المتصدرين، وتحذف حسابك من داخل التطبيق"],
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
        <section className="overflow-hidden bg-white pt-14 text-center sm:pt-20">
          <Image src="/site/app-icon.png" alt="أيقونة BunnList" width={88} height={88} priority className="mx-auto rounded-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]" />
          <p className="mt-6 text-[21px] font-semibold text-[var(--ink)] sm:text-[24px]">BunnList</p>
          <h1 className="mx-auto mt-2 max-w-[14ch] px-4 text-[44px] font-bold leading-[1.1] tracking-tight sm:text-[72px] lg:text-[88px]">
            قهوتك الجاية، هنا.
          </h1>
          <p className="mx-auto mt-5 max-w-[34ch] px-5 text-[19px] leading-relaxed text-[var(--ink-2)] sm:text-[24px]">
            اكتشف المحاصيل حسب ذوقك، حضّرها خطوة بخطوة بالحركة، وخلّ كل كوب أحسن من اللي قبله.
          </p>
          <div className="mt-8">
            <ComingSoon />
          </div>
          <div className="relative mx-auto mt-14 h-[420px] max-w-[1024px] sm:h-[560px]">
            <PhoneFrame className="absolute inset-x-0 top-0">
              <Image src="/site/discover.jpg" alt="شاشة «اكتشف» في التطبيق" fill sizes="300px" className="object-cover object-top" priority />
            </PhoneFrame>
          </div>
        </section>

        {/* Discover */}
        <section id="discover" className="scroll-mt-12 bg-[var(--bg-alt)] px-5 py-20 sm:py-28">
          <div className="mx-auto grid max-w-[1024px] items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-[17px] font-semibold text-[var(--accent)]">اكتشف</p>
              <h2 className="mt-2 text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[48px]">دليل قهوة، مو كتالوج.</h2>
              <p className="mt-5 text-[19px] leading-relaxed text-[var(--ink-2)]">
                كل محصول بصورة كيسه الأصلية، ومنشئه ومعالجته ونكهاته، والطرق اللي تناسبه. تصفّح حسب النكهة أو البلد، أو
                ابحث وفلتر بالمحمصة والمعالجة وطريقة التحضير.
              </p>
              <ul className="mt-8 grid grid-cols-2 gap-4 text-[15px]">
                {["أحدث إضافة", "حسب ذوقك", "من وين؟", "وصلت حديثًا"].map((t) => (
                  <li key={t} className="rounded-2xl bg-white px-4 py-3 font-medium">{t}</li>
                ))}
              </ul>
            </div>
            <PhoneFrame>
              <Image src="/site/discover-large-text.jpg" alt="«اكتشف» بخط مكبّر" fill sizes="300px" className="object-cover object-top" />
            </PhoneFrame>
          </div>
        </section>

        {/* Brew, in motion */}
        <section id="brew" className="scroll-mt-12 bg-black px-5 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-[1024px] text-center">
            <p className="text-[17px] font-semibold text-[var(--gold)]">حضّر</p>
            <h2 className="mx-auto mt-2 max-w-[16ch] text-[40px] font-bold leading-[1.1] tracking-tight sm:text-[64px]">
              كل خطوة، تشوفها قدّامك.
            </h2>
            <p className="mx-auto mt-5 max-w-[40ch] text-[19px] leading-relaxed text-[var(--dark-ink-2)] sm:text-[21px]">
              الماء ينزل خيط رفيع، والبن ينتفخ، والإبريق يمتلي، بنفس وقت وصفتك بالثانية. وقبل كل خطوة بثلاث ثواني
              يهتز الجوال خفيف عشان ترفع راسك في وقتها.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-[1024px] items-center gap-12 md:grid-cols-[1fr_auto_1fr]">
            <ul className="space-y-6 text-[17px] text-[var(--dark-ink-2)] md:text-left" dir="rtl">
              <li><b className="block text-[21px] text-white">V60 حار ومثلّج</b>صب حلزوني، تشريب، وثلج يذوب في الإبريق.</li>
              <li><b className="block text-[21px] text-white">إيروبريس</b>تحريك، نقع، ومكبس ينزل لين الهسهسة.</li>
            </ul>
            <PhoneFrame>
              <video className="h-full w-full object-cover" src="/site/brew-v60.mp4" poster="/site/brew-v60-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-label="تحضير V60 بالحركة في التطبيق" />
            </PhoneFrame>
            <ul className="space-y-6 text-[17px] text-[var(--dark-ink-2)]">
              <li><b className="block text-[21px] text-white">إسبريسو</b>خيطين يتغيّر لونهما، وكريما تتكوّن، وهدف ٢٥–٣٢ ثانية.</li>
              <li><b className="block text-[21px] text-white">قهوة عربية</b>دلة على نار، بن وهيل، وتركد، ثم فنجال.</li>
            </ul>
          </div>
          <div className="mx-auto mt-16 flex max-w-[1024px] flex-wrap justify-center gap-2">
            {methods.map((m) => (
              <span key={m} className="rounded-full border border-white/15 px-4 py-2 text-[14px] text-white/85">{m}</span>
            ))}
          </div>
        </section>

        {/* Features, as a bento grid */}
        <section id="features" className="scroll-mt-12 bg-[var(--bg-alt)] px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-[1024px]">
            <h2 className="text-center text-[34px] font-bold tracking-tight sm:text-[48px]">كل اللي يحتاجه محب القهوة.</h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <article
                  key={f.title}
                  className={`flex min-h-[220px] flex-col justify-between rounded-[28px] p-7 ${f.wide ? "lg:col-span-2" : ""} ${
                    f.dark ? "bg-black text-white" : "bg-white"
                  }`}
                >
                  <span className={f.dark ? "text-[var(--gold)]" : "text-[var(--accent)]"}>
                    <Icon d={f.icon} />
                  </span>
                  <div>
                    <h3 className="mt-8 text-[24px] font-semibold tracking-tight">{f.title}</h3>
                    <p className={`mt-2 text-[16px] leading-relaxed ${f.dark ? "text-[var(--dark-ink-2)]" : "text-[var(--ink-2)]"}`}>{f.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Specs */}
        <section id="specs" className="scroll-mt-12 bg-white px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-[880px]">
            <h2 className="text-[34px] font-bold tracking-tight sm:text-[48px]">المواصفات</h2>
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
          <div className="mx-auto max-w-[720px]">
            <p className="text-[17px] font-semibold text-[var(--accent)]">للمحامص</p>
            <h2 className="mt-2 text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[48px]">محاصيلكم، كما هي.</h2>
            <p className="mt-5 text-[19px] leading-relaxed text-[var(--ink-2)]">
              نعرض صور أكياسكم بدون أي تعديل على العبوة أو الشعار، مع اسم محمصتكم واضحًا. أرسلوا لنا صورًا بجودة أعلى أو
              معلومات أدق، أو اطلبوا تعديل أي شي أو حذفه في أي وقت.
            </p>
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("محمصة في BunnList")}`} className="mt-8 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-[17px] font-medium text-white transition hover:bg-[var(--accent-ink)]">
              تواصلوا معنا
            </a>
          </div>
        </section>

        {/* Closing */}
        <section className="bg-white px-5 py-24 text-center sm:py-32">
          <Image src="/site/app-icon.png" alt="" width={72} height={72} className="mx-auto rounded-[18px]" />
          <h2 className="mx-auto mt-6 max-w-[16ch] text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[56px]">قهوتك الجاية، هنا.</h2>
          <div className="mt-8"><ComingSoon /></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
