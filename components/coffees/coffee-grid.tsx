import type { CoffeeListItem } from "@/actions/coffees";
import { CoffeeCard } from "@/components/coffees/coffee-card";
import { EmptyState } from "@/components/ui/empty-state";
import { MotionGrid, MotionGridItem } from "@/components/ui/motion-primitives";

type CoffeeGridProps = {
  coffees: CoffeeListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  clearHref?: string;
  clearLabel?: string;
};

export function CoffeeGrid({
  coffees,
  emptyTitle = "لا توجد محاصيل حالياً",
  emptyDescription,
  clearHref,
  clearLabel,
}: CoffeeGridProps) {
  if (!coffees.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionHref={clearHref}
        actionLabel={clearHref ? clearLabel ?? "مسح الفلاتر" : undefined}
      />
    );
  }

  return (
    <MotionGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {coffees.map((coffee) => (
        <MotionGridItem key={coffee.id}>
          <CoffeeCard coffee={coffee} />
        </MotionGridItem>
      ))}
    </MotionGrid>
  );
}
