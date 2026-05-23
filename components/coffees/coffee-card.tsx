import Link from "next/link";
import type { CoffeeListItem } from "@/actions/coffees";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CoffeeImage } from "@/components/coffees/coffee-image";
import { FlavorChips } from "@/components/coffees/flavor-chips";
import { RatingDisplay } from "@/components/coffees/rating-display";
import { formatBrewMethod, formatProcess } from "@/lib/coffee-labels";

export function CoffeeCard({ coffee }: { coffee: CoffeeListItem }) {
  const regionName = coffee.regionAr;
  const topBrewMethod = coffee.recommendedBrewMethods[0];

  return (
    <Link href={`/coffees/${coffee.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-lg">

        {/* ── الصورة ── */}
        <CoffeeImage
          variant="card"
          imagePath={coffee.imagePath}
          imageUrl={coffee.imageUrl}
          imagePermissionStatus={coffee.imagePermissionStatus}
          coffeeName={coffee.nameAr}
          roasteryName={coffee.roaster.nameAr}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        />

        {/* ── المحتوى ── */}
        <div className="flex flex-1 flex-col gap-3 p-5">

          {/* Badge المعالجة */}
          <Badge variant="gold" className="w-fit">
            {formatProcess(coffee.process, coffee.processLabel)}
          </Badge>

          {/* الاسم */}
          <h3 className="line-clamp-2 text-xl font-bold leading-7 text-stone-950">
            {coffee.nameAr}
          </h3>

          {/* المحمصة + المنشأ */}
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-800">{coffee.roaster.nameAr}</p>
            <p className="text-sm text-stone-500">
              {coffee.originCountry.nameAr}
              {regionName ? `، ${regionName}` : ""}
            </p>
          </div>

          {/* تقييم المحصول */}
          <div>
            <p className="mb-1 text-xs font-semibold text-stone-400">تقييم المحصول</p>
            <RatingDisplay rating={coffee.averageRating} count={coffee.reviewCount} compact />
          </div>

          {/* Badge أفضل طريقة تحضير (إذا كان مقترح) */}
          {topBrewMethod ? (
            <div className="flex w-fit items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
              <span className="text-xs font-bold text-amber-600">مقترح لـ</span>
              <span className="text-xs font-bold text-amber-900">
                {coffee.recommendedBrewMethods.slice(0, 2).map(formatBrewMethod).join(" / ")}
              </span>
            </div>
          ) : null}

          {/* النكهات */}
          <FlavorChips notes={coffee.flavorNotes} limit={3} />

          {/* spacer لدفع المحتوى للأسفل */}
          <div className="mt-auto" />
        </div>
      </Card>
    </Link>
  );
}
