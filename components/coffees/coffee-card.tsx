import Link from "next/link";
import type { CoffeeListItem } from "@/actions/coffees";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CoffeeImage } from "@/components/coffees/coffee-image";
import { FlavorChips } from "@/components/coffees/flavor-chips";
import { RatingDisplay } from "@/components/coffees/rating-display";
import { formatBrewMethod, formatProcess } from "@/lib/coffee-labels";
import { getCoffeeImageUrl } from "@/lib/storage";

export function CoffeeCard({ coffee }: { coffee: CoffeeListItem }) {
  const regionName = coffee.regionAr;

  return (
    <Link href={`/coffees/${coffee.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          <CoffeeImage
            src={getCoffeeImageUrl(coffee.imagePath)}
            alt={`صورة ${coffee.nameAr}`}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="space-y-2">
            <Badge variant="gold" className="w-fit">{formatProcess(coffee.process, coffee.processLabel)}</Badge>
            <div>
              <p className="text-sm font-semibold text-amber-800">{coffee.roaster.nameAr}</p>
            </div>
            <div>
              <h3 className="line-clamp-2 text-xl font-bold leading-7 text-stone-950">{coffee.nameAr}</h3>
            </div>
            <p className="text-sm text-stone-500">
              {coffee.originCountry.nameAr}
              {regionName ? `، ${regionName}` : ""}
            </p>
          </div>
          <div className="mt-4">
            <RatingDisplay rating={coffee.averageRating} count={coffee.reviewCount} compact />
          </div>
          <div className="mt-4">
            <FlavorChips notes={coffee.flavorNotes} limit={3} />
          </div>
          <div className="mt-auto pt-5 text-xs font-semibold text-stone-500">
            {coffee.recommendedBrewMethods.slice(0, 2).map(formatBrewMethod).join(" / ")}
          </div>
        </div>
      </Card>
    </Link>
  );
}
