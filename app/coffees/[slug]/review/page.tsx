import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BrewMethod } from "@prisma/client";
import { getCoffeeLotBySlug } from "@/actions/coffees";
import { getUserReviewForCoffeeLot } from "@/actions/reviews";
import { CoffeeImage } from "@/components/coffees/coffee-image";
import { ReviewForm } from "@/components/reviews/review-form";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";
import { requireAuth } from "@/lib/auth-helpers";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata = { title: "إضافة تقييم — BunnList" };

export default async function CoffeeReviewPage({ params }: PageProps) {
  await requireAuth();
  const { slug } = await params;
  const coffee = await getCoffeeLotBySlug(slug);

  if (!coffee) {
    notFound();
  }

  const userReview = await getUserReviewForCoffeeLot(coffee.id);

  return (
    <main className="min-h-screen bg-stone-50">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-500">
          <Link href="/coffees" className="hover:text-amber-800">
            المحاصيل
          </Link>
          <span>/</span>
          <Link href={`/coffees/${coffee.slug}`} className="hover:text-amber-800">
            {coffee.nameAr}
          </Link>
          <span>/</span>
          <span className="text-stone-900">{userReview ? "تعديل تقييم" : "إضافة تقييم"}</span>
        </nav>

        <Link
          href={`/coffees/${coffee.slug}`}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-amber-800 hover:text-amber-900"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للمحصول
        </Link>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="overflow-hidden">
            <CoffeeImage
              variant="card"
              imagePath={coffee.imagePath}
              imageUrl={coffee.imageUrl}
              imagePermissionStatus={coffee.imagePermissionStatus}
              coffeeName={coffee.nameAr}
              roasteryName={coffee.roaster.nameAr}
              sizes="(min-width: 1024px) 280px, 100vw"
            />
            <div className="p-5">
              <h1 className="text-2xl font-black text-stone-950">{coffee.nameAr}</h1>
              <p className="mt-2 text-sm font-semibold text-amber-800">{coffee.roaster.nameAr}</p>
              <p className="mt-2 text-sm text-stone-500">
                {coffee.originCountry.nameAr}
                {coffee.regionAr ? `، ${coffee.regionAr}` : ""}
              </p>
            </div>
          </Card>

          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-stone-950">
                {userReview ? "عدّل تقييمك" : "أضف تقييمك"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                شارك تجربتك ليستفيد محبو القهوة قبل شراء هذا المحصول.
              </p>
            </div>
            <ReviewForm
              coffeeLotId={coffee.id}
              coffeeSlug={coffee.slug}
              initialReview={userReview}
              brewMethods={coffee.recommendedBrewMethods.length ? coffee.recommendedBrewMethods : Object.values(BrewMethod)}
            />
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
