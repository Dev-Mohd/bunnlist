import Link from "next/link";
import type { CoffeeListItem } from "@/actions/coffees";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CoffeeImage } from "@/components/coffees/coffee-image";
import { FlavorChips } from "@/components/coffees/flavor-chips";
import { RatingDisplay } from "@/components/coffees/rating-display";
import { formatBrewMethod, formatProcess } from "@/lib/coffee-labels";
import { getCoffeeImageUrl } from "@/lib/storage";

type CoffeeCardData = CoffeeListItem & {
  price?: number | string | null;
  weight?: string | null;
  weightGrams?: number | null;
};

function formatPrice(price: CoffeeCardData["price"]) {
  if (price === null || price === undefined || price === "") {
    return null;
  }

  if (typeof price === "number") {
    return `${price.toLocaleString("ar-SA")} ر.س`;
  }

  return price;
}

function formatWeight(coffee: CoffeeCardData) {
  if (coffee.weight) {
    return coffee.weight;
  }

  if (coffee.weightGrams) {
    return `${coffee.weightGrams.toLocaleString("ar-SA")} جم`;
  }

  return null;
}

function BrewMethodChips({ methods }: { methods: CoffeeListItem["recommendedBrewMethods"] }) {
  if (!methods.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {methods.slice(0, 3).map((method) => (
        <span
          key={method}
          className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold leading-none text-amber-900"
        >
          {formatBrewMethod(method)}
        </span>
      ))}
    </div>
  );
}

export function CoffeeCard({ coffee }: { coffee: CoffeeListItem }) {
  const coffeeData = coffee as CoffeeCardData;
  const price = formatPrice(coffeeData.price);
  const weight = formatWeight(coffeeData);

  return (
    <Link href={`/coffees/${coffee.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden border-stone-200/80 transition duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-lg">
        <CoffeeImage
          src={getCoffeeImageUrl(coffee.imagePath)}
          alt={`صورة ${coffee.name}`}
          className="rounded-b-none border-b border-stone-100 p-6"
        />
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-amber-800">{coffee.roaster.name}</p>
            <h3 className="mt-1 line-clamp-2 text-xl font-black leading-7 text-stone-950 transition group-hover:text-amber-900">
              {coffee.name}
            </h3>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-600">
            <Badge variant="soft" className="bg-stone-100 text-stone-700">
              {coffee.originCountry.nameAr}
              {coffee.region ? `، ${coffee.region}` : ""}
            </Badge>
            <Badge variant="outline">{formatProcess(coffee.process, coffee.processLabel)}</Badge>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <RatingDisplay rating={coffee.averageRating} count={coffee.reviewCount} compact />
            {(price || weight) ? (
              <div className="shrink-0 text-left text-xs font-bold text-stone-700">
                {price ? <div>{price}</div> : null}
                {weight ? <div className="mt-0.5 text-stone-500">{weight}</div> : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 min-h-6">
            <FlavorChips notes={coffee.flavorNotes} limit={3} />
          </div>

          <div className="mt-auto pt-5">
            <BrewMethodChips methods={coffee.recommendedBrewMethods} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
