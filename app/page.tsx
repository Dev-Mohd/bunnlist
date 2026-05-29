import { FeatureGrid } from "@/components/FeatureGrid";
import { HeroRatingCard } from "@/components/HeroRatingCard";
import { HowItWorks } from "@/components/HowItWorks";
import { SocialLinks } from "@/components/SocialLinks";
import { WaitlistForm } from "@/components/WaitlistForm";
import Link from "next/link";

const problemChips = [
  "هل يستاهل السعر؟",
  "هل يناسب V60؟",
  "هل يطلع ممتاز للإسبريسو؟",
  "هل النكهات واضحة فعلًا؟",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#EDE3D6] text-[#171411]">
      <section className="relative border-b border-[#4A3428]/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(214,168,79,0.18),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(109,123,97,0.18),transparent_28%)]" />
        <div className="mx-auto grid min-h-[88vh] w-full max-w-7xl items-center gap-10 px-5 py-8 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-14">
          <div>
            <nav className="mb-14 flex items-center gap-3">
              <Link
                className="inline-flex items-center gap-3 text-left font-black tracking-[0.16em] text-[#171411]"
                href="/"
                aria-label="BunnList"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#171411] text-lg font-black text-[#EDE3D6] shadow-sm">
                  B
                </span>
                <span dir="ltr">BunnList</span>
              </Link>
            </nav>

            <p className="mb-5 inline-flex rounded-full border border-[#6D7B61]/25 bg-white/45 px-4 py-2 text-xs font-bold text-[#4A3428]">
              اكتشف، قيّم، وقارن محاصيل القهوة المختصة
            </p>
            <h1 className="max-w-4xl text-balance text-4xl font-black leading-[1.16] tracking-normal text-[#171411] sm:text-6xl lg:text-7xl">
              قبل لا تشتري محصولك الجاي، شوف تقييم الناس له
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-8 text-[#4A3428] sm:text-xl sm:leading-10">
              BunnList منصة مجتمعية لاكتشاف وتقييم محاصيل القهوة المختصة. اعرف وش يستاهل، وش أفضل طريقة تحضير،
              وقارن بين المحاصيل بثقة.
            </p>
            <p className="mt-5 max-w-xl rounded-2xl border border-[#4A3428]/10 bg-white/45 px-4 py-3 text-sm font-bold leading-7 text-[#171411]">
              لسنا متجر قهوة. نحن مرجع تقييم يساعدك تختار أفضل.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#waitlist"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#171411] px-6 py-4 text-sm font-bold text-[#EDE3D6] shadow-[0_18px_45px_rgba(23,20,17,0.18)] transition hover:-translate-y-0.5 hover:bg-[#4A3428] focus:outline-none focus:ring-2 focus:ring-[#D6A84F] focus:ring-offset-2 focus:ring-offset-[#EDE3D6]"
              >
                انضم لقائمة الانتظار
              </a>
              <a
                href="#social"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#4A3428]/15 bg-white/50 px-6 py-4 text-sm font-bold text-[#4A3428] transition hover:-translate-y-0.5 hover:border-[#6D7B61]/50 hover:text-[#171411]"
              >
                تابع التحديثات على حساباتنا
              </a>
            </div>
            <p className="mt-4 text-sm font-medium text-[#4A3428]/70">دخول مبكر للنسخة التجريبية عند الإطلاق.</p>
          </div>

          <HeroRatingCard />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8" aria-labelledby="what-title">
        <div className="grid gap-8 rounded-[8px] border border-[#4A3428]/10 bg-white/45 p-6 shadow-[0_24px_80px_rgba(74,52,40,0.08)] sm:p-8 lg:grid-cols-[0.7fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black text-[#6D7B61]">Community reference</p>
            <h2 id="what-title" className="mt-3 text-3xl font-black text-[#171411] sm:text-4xl">
              ما هو BunnList؟
            </h2>
          </div>
          <div>
            <p className="text-base leading-8 text-[#4A3428] sm:text-lg sm:leading-9">
              BunnList منصة تجمع تقييمات وتجارب محبي القهوة المختصة حول محاصيل القهوة. بدل ما تعتمد فقط على وصف
              المحمصة، تقدر تشوف تقييم المجتمع، ملاحظات التحضير، وأفضل الطرق المناسبة لكل محصول.
            </p>
            <p className="mt-5 rounded-2xl border border-[#D6A84F]/35 bg-[#D6A84F]/12 px-4 py-3 text-sm font-black text-[#171411]">
              الفكرة ببساطة: مرجع مجتمعي لمحاصيل القهوة المختصة.
            </p>
          </div>
        </div>
      </section>

      <HowItWorks />

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8" aria-labelledby="problem-title">
        <div className="rounded-[8px] bg-[#171411] p-6 text-[#EDE3D6] shadow-[0_24px_90px_rgba(23,20,17,0.2)] sm:p-8 lg:p-10">
          <h2 id="problem-title" className="text-3xl font-black sm:text-4xl">
            وصف المحصول وحده ما يكفي
          </h2>
          <p className="mt-5 max-w-4xl text-pretty text-base leading-8 text-[#EDE3D6]/78 sm:text-lg sm:leading-9">
            كثير من المحاصيل توصف بنكهات جميلة مثل فراولة، عسل، شوكولاتة، أو ورد. لكن التجربة الفعلية تختلف حسب
            التحضير، الطحنة، الماء، والمحمصة. BunnList يجمع تجارب الناس عشان تعرف هل المحصول يستاهل فعلًا قبل لا
            تشتريه.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {problemChips.map((chip) => (
              <span className="rounded-full border border-[#EDE3D6]/15 bg-[#EDE3D6]/8 px-4 py-2 text-sm font-bold" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      <FeatureGrid />

      <section
        id="waitlist"
        className="mx-auto w-full max-w-4xl px-5 py-16 text-center sm:px-6 lg:px-8"
        aria-labelledby="waitlist-title"
      >
        <div className="rounded-[8px] border border-[#4A3428]/10 bg-white/55 px-5 py-10 shadow-[0_24px_80px_rgba(74,52,40,0.08)] sm:px-10">
          <p className="text-sm font-black text-[#6D7B61]">Early access</p>
          <h2 id="waitlist-title" className="mt-3 text-3xl font-black text-[#171411] sm:text-4xl">
            كن من أوائل من يجرّب BunnList
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#4A3428]/78 sm:text-base">
            سجّل الآن لتحصل على دخول مبكر للنسخة التجريبية، وتساهم في بناء أول مرجع مجتمعي عربي لتقييم محاصيل
            القهوة المختصة.
          </p>
          <WaitlistForm />
          <p className="mx-auto mt-4 max-w-xl text-xs font-medium leading-6 text-[#4A3428]/65">
            أول المستخدمين بيكون لهم دور في ترشيح المحامص والمحاصيل قبل الإطلاق.
          </p>
        </div>
      </section>

      <SocialLinks />

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 border-t border-[#4A3428]/10 px-5 py-8 text-sm text-[#4A3428]/70 sm:flex-row">
        <div className="text-center sm:text-right">
          <p dir="ltr">BunnList © 2026</p>
          <p className="mt-1">منصة لاكتشاف وتقييم محاصيل القهوة المختصة.</p>
        </div>
        <p dir="ltr">Built for specialty coffee lovers in Saudi Arabia and the Gulf.</p>
      </footer>
    </main>
  );
}
