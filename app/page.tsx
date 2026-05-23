import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowLeft,
  BarChart3,
  Coffee,
  Compass,
  FlaskConical,
  Gift,
  Leaf,
  MessageSquareText,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import {
  getCoffeeLots,
  getLatestCoffeeReviews,
  type CoffeeListItem,
  type LatestCoffeeReview,
} from "@/actions/coffees";
import { CoffeeCard } from "@/components/coffees/coffee-card";
import { CoffeeSearchBar } from "@/components/coffees/coffee-search-bar";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";
import { formatBrewMethod } from "@/lib/coffee-labels";

export const dynamic = "force-dynamic";

// ── Brand tokens ──────────────────────────────────────────────────
const B = {
  black: "#171411",
  brown: "#4A3428",
  cream: "#EDE3D6",
  olive: "#6D7B61",
  caramel: "#B97945",
} as const;

// ── Static data ───────────────────────────────────────────────────

const FEATURES = [
  {
    key: "اكتشف",
    description: "ابحث عن محاصيل حسب المحمصة، الدولة، المعالجة، أو النكهات.",
    icon: Compass,
  },
  {
    key: "قيّم",
    description: "شارك تجربتك وساعد غيرك يعرف هل المحصول يستاهل.",
    icon: Star,
  },
  {
    key: "قارن",
    description: "قارن بين محصولين قبل الشراء.",
    icon: BarChart3,
  },
  {
    key: "حضّر أفضل",
    description: "اعرف هل المحصول يناسب V60 أو الإسبريسو أو الكيمكس.",
    icon: Coffee,
  },
  {
    key: "استكشف",
    description: "شوف اختيارات المجتمع والمحاصيل الأعلى تفاعلًا.",
    icon: Users,
  },
] as const;

const RECOMMENDATION_CHIPS = [
  { label: "V60",          href: "/coffees?brewMethods=V60" },
  { label: "إسبريسو",     href: "/coffees?brewMethods=ESPRESSO" },
  { label: "كيمكس",        href: "/coffees?brewMethods=CHEMEX" },
  { label: "فواكه",        href: "/coffees?flavorNotes=Cherry,Peach,Blueberry" },
  { label: "شوكولاتة",   href: "/coffees?flavorNotes=Chocolate,Dark%20Chocolate" },
  { label: "حلاوة عالية", href: "/coffees?sort=top-rated" },
  { label: "مناسب للبداية", href: "/coffees?sort=latest" },
] as const;

const GOAL_CARDS = [
  {
    title: "محصول يومي",
    description: "خيارات سهلة ومتوازنة للاستخدام اليومي.",
    href: "/coffees?sort=latest",
    icon: Coffee,
  },
  {
    title: "إسبريسو واضح",
    description: "محاصيل مناسبة للمكينة وتعطي استخلاص أوضح.",
    href: "/coffees?brewMethods=ESPRESSO",
    icon: Zap,
  },
  {
    title: "V60 فاكهي",
    description: "محاصيل بطابع فاكهي وتجربة واضحة بالترشيح.",
    href: "/coffees?brewMethods=V60",
    icon: Leaf,
  },
  {
    title: "هدية آمنة",
    description: "خيارات مناسبة لمعظم الأذواق.",
    href: "/coffees?sort=top-rated",
    icon: Gift,
  },
  {
    title: "تجربة مختلفة",
    description: "معالجات ونكهات غير معتادة لمحبي التجربة.",
    href: "/coffees?processingMethods=ANAEROBIC,EXPERIMENTAL",
    icon: FlaskConical,
  },
] as const;

// ── Shared components ─────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel = "عرض الكل",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-sm font-black" style={{ color: B.caramel }}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-black text-[#171411] sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">{description}</p>
        ) : null}
      </div>
      {actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 text-sm font-black text-[#4A3428] transition hover:text-[#B97945]"
        >
          {actionLabel}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

// ── Static sections ───────────────────────────────────────────────

function HomeFeatureCards() {
  return (
    <section className="bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="قيمة BunnList"
          title="كل ما تحتاجه قبل شراء المحصول"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className="rounded-lg border border-[#EDE3D6] bg-[#EDE3D6]/30 p-5"
              >
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: B.cream, color: B.brown }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-4 text-base font-black text-[#171411]">{feature.key}</p>
                <p className="mt-1.5 text-sm leading-6 text-stone-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HomeQuickRecommendation() {
  return (
    <section className="border-y border-[#EDE3D6] bg-[#EDE3D6]/45 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black" style={{ color: B.olive }}>
              توصية سريعة
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#171411] sm:text-3xl">
              محتار وش تختار؟
            </h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              اختر طريقة التحضير والنكهة، ونوصلك لمحاصيل أقرب لذوقك.
            </p>
          </div>
          <Link
            href="/coffees"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-6 text-sm font-black text-white shadow-sm transition hover:opacity-90"
            style={{ background: B.caramel }}
          >
            <Sparkles className="h-4 w-4" />
            اعرض الترشيحات
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {RECOMMENDATION_CHIPS.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className="rounded-full border bg-white px-4 py-2 text-sm font-bold text-[#4A3428] shadow-sm transition hover:border-[#B97945] hover:text-[#B97945]"
              style={{ borderColor: "#d6c9b8" }}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeGoalCards() {
  return (
    <section className="bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="ابدأ من هدفك"
          title="وش هدفك اليوم؟"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {GOAL_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group flex flex-col justify-between rounded-lg border border-[#EDE3D6] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#B97945] hover:shadow-md"
              >
                <div>
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: B.cream, color: B.brown }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-4 text-base font-black leading-6 text-[#171411]">{card.title}</p>
                  <p className="mt-1.5 text-sm leading-6 text-stone-600">{card.description}</p>
                </div>
                <span
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-black transition group-hover:text-[#B97945]"
                  style={{ color: B.olive }}
                >
                  اكتشف
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HomeContributeSection({ hasReviews }: { hasReviews: boolean }) {
  return (
    <section
      className="rounded-xl px-6 py-8 sm:px-8"
      style={{ background: B.black }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black" style={{ color: B.caramel }}>
            {hasReviews ? "إشارات المجتمع" : "ساهم في المجتمع"}
          </p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
            جربت محصول؟ ساعد غيرك يقرر
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7" style={{ color: B.cream }}>
            أضف تقييمك لطريقة التحضير والنكهات اللي ظهرت لك، وخل تجربة الشراء أوضح للمجتمع.
          </p>
        </div>
        <Link
          href="/coffees"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-6 text-sm font-black text-[#171411] shadow-sm transition hover:opacity-90"
          style={{ background: B.cream }}
        >
          <MessageSquareText className="h-4 w-4" />
          قيّم محصول
        </Link>
      </div>
    </section>
  );
}

// ── Review signal card ────────────────────────────────────────────

function ReviewSignal({ review }: { review: LatestCoffeeReview }) {
  const body = review.body?.trim();
  const reviewerName = review.user.name ?? "مستخدم BunnList";

  return (
    <Link
      href={`/coffees/${review.coffeeLot.slug}`}
      className="block rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-[#B97945] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black" style={{ color: B.caramel }}>
            {review.coffeeLot.roaster.name}
          </p>
          <h3 className="mt-1 line-clamp-2 font-black leading-7 text-[#171411]">
            {review.coffeeLot.name}
          </h3>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black text-white"
          style={{ background: B.black }}
        >
          <Star className="h-3.5 w-3.5 fill-current" />
          {review.rating}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-stone-600">
        <Badge variant="outline">{formatBrewMethod(review.brewMethod)}</Badge>
        <Badge
          className={
            review.wouldBuyAgain
              ? "text-white"
              : "bg-stone-100 text-stone-600"
          }
          style={review.wouldBuyAgain ? { background: B.olive } : undefined}
        >
          {review.wouldBuyAgain ? "يرشّحه للشراء" : "لا يفضّل تكراره"}
        </Badge>
      </div>
      {body ? (
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-700">{body}</p>
      ) : null}
      <p className="mt-3 text-xs font-bold text-stone-400">{reviewerName}</p>
    </Link>
  );
}

// ── Coffee rail ───────────────────────────────────────────────────

function CoffeeRail({
  title,
  description,
  href,
  coffees,
}: {
  title: string;
  description?: string;
  href: string;
  coffees: CoffeeListItem[];
}) {
  if (!coffees.length) return null;

  return (
    <section className="space-y-5">
      <SectionHeading
        title={title}
        description={description}
        actionHref={href}
        actionLabel="استكشف كل المحاصيل"
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {coffees.map((coffee) => (
          <CoffeeCard key={coffee.id} coffee={coffee} />
        ))}
      </div>
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-[430px] animate-pulse rounded-lg bg-stone-200" />
      ))}
    </div>
  );
}

// ── Async content (server data) ───────────────────────────────────

async function HomeContent() {
  const [latest, reviews] = await Promise.all([
    getCoffeeLots({ sort: "latest", perPage: 3 }),
    getLatestCoffeeReviews(3),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      {/* Starter Picks — max 3 cards */}
      <CoffeeRail
        title="اختيارات تساعدك تبدأ"
        description="اقتراحات محدودة وحديثة حتى لا تضيع بين كل الخيارات."
        href="/coffees?sort=latest"
        coffees={latest.items}
      />

      {/* Community reviews */}
      {reviews.length ? (
        <section className="space-y-5">
          <SectionHeading
            eyebrow="إشارات المجتمع"
            title="التقييمات تجعل القرار أذكى"
            description="اقرأ تجربة مختصرة، طريقة التحضير، وهل يشتريها المستخدم مرة ثانية."
            actionHref="/coffees?sort=most-reviewed"
            actionLabel="شاهد الأكثر مراجعة"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewSignal key={review.id} review={review} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Community CTA */}
      <HomeContributeSection hasReviews={reviews.length > 0} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />

      {/* 1. Hero */}
      <section className="relative overflow-hidden text-white" style={{ background: B.black }}>
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(237,227,214,0.16)_1px,transparent_1px),linear-gradient(180deg,rgba(237,227,214,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-4xl">
            <p
              className="mb-4 inline-flex rounded-full px-3 py-1 text-sm font-black"
              style={{ background: B.cream, color: B.brown }}
            >
              اكتشف · قيّم · قارن · حضّر أفضل
            </p>
            <h1 className="text-4xl font-black leading-[1.18] sm:text-5xl md:text-6xl">
              اكتشف محصولك القادم بثقة
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 sm:text-lg sm:leading-9" style={{ color: B.cream }}>
              BunnList يساعدك تقارن المحاصيل، تشوف تجارب المجتمع، وتعرف أنسب طريقة تحضير قبل الشراء.
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/coffees?sort=top-rated"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-black text-[#171411] shadow-sm transition hover:opacity-90"
              style={{ background: B.caramel }}
            >
              <Sparkles className="h-4 w-4" />
              رشّح لي محصول
            </Link>
            <Link
              href="/coffees"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:border-white/40 hover:bg-white/20"
            >
              استكشف المحاصيل
            </Link>
          </div>

          {/* Search */}
          <div className="mt-7 max-w-2xl">
            <CoffeeSearchBar
              placeholder="ابحث باسم المحصول أو المحمصة..."
              targetPath="/coffees"
            />
          </div>

          {/* Value mini-cards */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { label: "اكتشف",   text: "محاصيل جديدة ومنظمة",   icon: Compass },
              { label: "قيّم",    text: "تجارب مجتمع واضحة",       icon: MessageSquareText },
              { label: "قارن",   text: "حسب الأداة والنكهة",       icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-white/10 bg-white/10 p-4"
                >
                  <Icon className="h-5 w-5" style={{ color: B.caramel }} />
                  <p className="mt-3 text-lg font-black">{item.label}</p>
                  <p className="mt-1 text-sm" style={{ color: B.cream }}>{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Core Features */}
      <HomeFeatureCards />

      {/* 3. Quick Recommendation */}
      <HomeQuickRecommendation />

      {/* 4. Goal Cards */}
      <HomeGoalCards />

      {/* 5 + 6. Starter Picks + Community (server data) */}
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <SectionSkeleton />
          </div>
        }
      >
        <HomeContent />
      </Suspense>

      <SiteFooter />
    </main>
  );
}
