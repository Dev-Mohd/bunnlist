import type { CoffeeListItem } from "@/actions/coffees";
import { CoffeeCard } from "@/components/coffees/coffee-card";
import { EmptyState } from "@/components/ui/empty-state";

type CoffeeGridProps = {
  coffees: CoffeeListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  clearHref?: string;
};

export function CoffeeGrid({
  coffees,
  emptyTitle = "لا توجد محاصيل حالياً",
  emptyDescription,
  clearHref,
}: CoffeeGridProps) {
  if (!coffees.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionHref={clearHref}
        actionLabel={clearHref ? "مسح الفلاتر" : undefined}
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {coffees.map((coffee) => (
        <CoffeeCard key={coffee.id} coffee={coffee} />
      ))}
    </div>
  );
}
