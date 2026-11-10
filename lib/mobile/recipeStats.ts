import type { PrismaClient } from "@prisma/client";

// «حضّرها N شخص»: how many people brewed a published recipe, counting each person once
// and not the author. Brews name the recipe either by its id or as "recipe:<id>".

export async function recipeBrewCounts(
  prisma: PrismaClient, recipes: { id: string; accountId: string }[],
): Promise<Map<string, number>> {
  if (recipes.length === 0) return new Map();
  const author = new Map(recipes.map((r) => [r.id, r.accountId]));
  const keys = recipes.flatMap((r) => [r.id, `recipe:${r.id}`]);
  const rows = await prisma.mobileBrewExperience.findMany({
    where: { recipeId: { in: keys }, state: { not: "deleted" } },
    select: { recipeId: true, accountId: true },
    distinct: ["recipeId", "accountId"],
  });
  const people = new Map<string, Set<string>>();
  for (const row of rows) {
    const id = row.recipeId!.startsWith("recipe:") ? row.recipeId!.slice("recipe:".length) : row.recipeId!;
    if (author.get(id) === row.accountId) continue;
    const set = people.get(id) ?? new Set<string>();
    set.add(row.accountId);
    people.set(id, set);
  }
  return new Map(recipes.map((r) => [r.id, people.get(r.id)?.size ?? 0]));
}
