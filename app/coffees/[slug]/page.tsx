import { notFound } from "next/navigation";
import { Check, Coffee, MapPin } from "lucide-react";
import { getCoffeeLotBySlug } from "@/actions/coffees";
import { CoffeeImage } from "@/components/coffees/coffee-image";
import { FlavorChips } from "@/components/coffees/flavor-chips";
import { RatingDisplay } from "@/components/coffees/rating-display";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";
import { formatBrewMethod, formatProcess } from "@/lib/coffee-labels";
import { getCoffeeImageUrl } from "@/lib/storage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <dt className="text-xs font-bold text-stone-500">{label}</dt>
      <dd className="mt-1 text-base font-bold text-stone-900">{value}</dd>
    </div>
  );
}

function BestBrew({ coffee }: { coffee: Awaited<ReturnType<typeof getCoffeeLotBySlug>> }) {
  if (!coffee) return null;

  const bestStat = coffee.brewStats[0];

  if (bestStat) {
    return (
      <div className="rounded-lg bg-amber-50 p-4 text-amber-950">
        <p className="text-sm font-bold">أفضل طريقة تحضير حسب التجارب</p>
        <p className="mt-1 text-2xl font-black">{formatBrewMethod(bestStat.brewMethod)}</p>
        <p className="mt-1 text-sm text-amber-900">
          متوسط {bestStat.averageRating.toFixed(1)} من {bestStat.reviewCount} تجربة
        </p>
      </div>
    );
  }

  if (coffee.recommendedBrewMethods.length) {
    return (
      <div className="rounded-lg bg-stone-100 p-4 text-stone-800">
        <p className="text-sm font-bold">طرق التحضير المقترحة</p>
        <p className="mt-1 text-lg font-black">
          {coffee.recommendedBrewMethods.map(formatBrewMethod).join("، ")}
        </p>
      </div>
    );
  }

  return null;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const coffee = await getCoffeeLotBySlug(slug);

  if (!coffee) {
    return { title: "محصول غير موجود | BunnList" };
  }

  return {
    title: `${coffee.name} | BunnList`,
    description: `تقييمات وتجارب تحضير ${coffee.name} من ${coffee.roaster.name}.`,
  };
}

export default async function CoffeeDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  const coffee = await getCoffeeLotBySlug(slug);

  if (!coffee) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-100 shadow-sm">
            <CoffeeImage
              src={getCoffeeImageUrl(coffee.imagePath)}
              alt={`صورة ${coffee.name}`}
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              <Badge variant="gold">{formatProcess(coffee.process, coffee.processLabel)}</Badge>
              <Badge variant="outline">{coffee.originCountry.nameAr}</Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight text-stone-950 sm:text-5xl">{coffee.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-semibold text-stone-600">
              <span className="inline-flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-800" />
                {coffee.roaster.name}
              </span>
              {coffee.region ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-800" />
                  {coffee.region}
                </span>
              ) : null}
            </div>
            <div className="mt-6">
              <RatingDisplay rating={coffee.averageRating} count={coffee.reviewCount} />
            </div>
            <div className="mt-6">
              <BestBrew coffee={coffee} />
            </div>
            <div className="mt-6">
              <FlavorChips notes={coffee.flavorNotes} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-black text-stone-950">معلومات المحصول</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <DetailRow label="الدولة" value={coffee.originCountry.nameAr} />
              <DetailRow label="المنطقة" value={coffee.region} />
              <DetailRow label="المعالجة" value={formatProcess(coffee.process, coffee.processLabel)} />
              <DetailRow label="السلالة" value={coffee.variety} />
              <DetailRow label="الارتفاع" value={coffee.altitudeMeters ? `${coffee.altitudeMeters} متر` : null} />
              <DetailRow
                label="طرق التحضير المقترحة"
                value={coffee.recommendedBrewMethods.map(formatBrewMethod).join("، ")}
              />
            </dl>
          </section>

          {coffee.description ? (
            <section>
              <h2 className="text-2xl font-black text-stone-950">الوصف</h2>
              <p className="mt-4 rounded-lg border border-stone-200 bg-white p-5 leading-8 text-stone-700">
                {coffee.description}
              </p>
            </section>
          ) : null}

          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-stone-950">تقييمات المستخدمين</h2>
              {coffee.reviewCount ? <span className="text-sm font-semibold text-stone-500">{coffee.reviewCount} تقييم</span> : null}
            </div>
            {coffee.reviews.length ? (
              <div className="space-y-4">
                {coffee.reviews.map((review) => (
                  <Card key={review.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-stone-950">{review.user.name ?? "مستخدم BunnList"}</p>
                        <p className="mt-1 text-sm text-stone-500">{formatBrewMethod(review.brewMethod)}</p>
                      </div>
                      <RatingDisplay rating={review.rating} count={1} compact />
                    </div>
                    {review.body ? <p className="mt-4 leading-8 text-stone-700">{review.body}</p> : null}
                    <Separator className="my-4" />
                    <p className="flex items-center gap-2 text-sm font-semibold text-stone-600">
                      <Check className="h-4 w-4 text-emerald-600" />
                      {review.wouldBuyAgain ? "سيشتريه مرة أخرى" : "لا يفضّل شراءه مرة أخرى"}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="كن أول من يقيّم هذا المحصول"
                description="إضافة التقييمات ستتوفر في دفعة لاحقة بعد تفعيل تسجيل الدخول."
              />
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="text-lg font-black text-stone-950">ملخص سريع</h2>
            <div className="mt-4 space-y-3 text-sm text-stone-700">
              <p>المحمصة: {coffee.roaster.name}</p>
              <p>المنشأ: {coffee.originCountry.nameAr}</p>
              <p>المعالجة: {formatProcess(coffee.process, coffee.processLabel)}</p>
              <p>عدد التقييمات: {coffee.reviewCount}</p>
            </div>
          </Card>
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
