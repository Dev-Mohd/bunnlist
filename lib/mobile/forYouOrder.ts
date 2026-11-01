import type { PrismaClient } from "@prisma/client";
import { flavorFamily } from "./flavorFamilies";
import { hash, riyadhDay } from "./forYou";

// The «لك» order for the catalog: coffees close to what the person said they like
// at signup (flavour families, brew methods) and to what they collect and rate
// highly come first, mixed with a shuffle that is fixed for the day (so paging
// stays consistent) and changes tomorrow. Without any signal it is a plain daily
// shuffle. Coffees they already own sink, and one roaster doesn't fill the top.

export interface TasteSignal {
  /** Family → weight, about 0–1. */
  families: Map<string, number>;
  brews: Set<string>;
  owned: Set<string>;
}

export const EMPTY_SIGNAL: TasteSignal = { families: new Map(), brews: new Set(), owned: new Set() };

/** Picked families count fully; collected and well-rated coffees add what they lean to. */
export function buildSignal(input: {
  tastePrefs: string[]; brewPrefs: string[]; likedNotes: string[][]; owned: string[];
}): TasteSignal {
  const families = new Map<string, number>();
  for (const f of input.tastePrefs) families.set(f, 1);
  const counts = new Map<string, number>();
  for (const notes of input.likedNotes) {
    for (const f of new Set(notes.map(flavorFamily))) if (f !== "other") counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const top = Math.max(0, ...counts.values());
  for (const [f, n] of counts) families.set(f, Math.min(1, (families.get(f) ?? 0) + 0.7 * (n / top)));
  return { families, brews: new Set(input.brewPrefs), owned: new Set(input.owned) };
}

const JITTER = 1.2;

/** 0–1, the same for this coffee all day for this person. */
export function dailyNoise(seed: string, id: string): number {
  return hash(`${seed}|${id}`) / 4294967296;
}

export function forYouScore(
  lot: { id: string; flavorNotes: string[]; recommendedBrewMethods?: string[] | null; imageUrl?: string | null },
  signal: TasteSignal, seed: string,
): number {
  const fams = [...new Set(lot.flavorNotes.map(flavorFamily))].filter((f) => f !== "other");
  const weights = fams.map((f) => signal.families.get(f) ?? 0);
  const best = Math.max(0, ...weights);
  // The closest family counts most; each further liked one adds a little.
  const taste = best + 0.25 * (weights.reduce((a, b) => a + b, 0) - best);
  let score = Math.min(taste, 1.5) * 2;
  if ((lot.recommendedBrewMethods ?? []).some((m) => signal.brews.has(m))) score += 0.5;
  if (signal.owned.has(lot.id)) score -= 2;
  if (!lot.imageUrl) score -= 0.5;
  return score + JITTER * dailyNoise(seed, lot.id);
}

/** No more than two of one roaster in any five in a row (others move up; nothing is dropped). */
export function spreadRoasters<T>(rows: T[], roasterOf: (row: T) => string, window = 5, most = 2): T[] {
  const out: T[] = [];
  const waiting = [...rows];
  while (waiting.length) {
    const recent = out.slice(-window + 1).map(roasterOf);
    const i = waiting.findIndex((r) => recent.filter((x) => x === roasterOf(r)).length < most);
    out.push(...waiting.splice(i === -1 ? 0 : i, 1));
  }
  return out;
}

export function forYouOrder<T extends { id: string; flavorNotes: string[]; recommendedBrewMethods?: string[] | null; imageUrl?: string | null; roaster?: { nameAr: string } | null }>(
  rows: T[], signal: TasteSignal, seed: string,
): T[] {
  const sorted = rows
    .map((row) => ({ row, score: forYouScore(row, signal, seed) }))
    .sort((a, b) => b.score - a.score || a.row.id.localeCompare(b.row.id))
    .map((s) => s.row);
  return spreadRoasters(sorted, (r) => r.roaster?.nameAr ?? "");
}

/** The seed and taste signal for one viewer (guests share the day's shuffle). */
export async function viewerSignal(prisma: PrismaClient, accountId: string | null, now = new Date()): Promise<{ signal: TasteSignal; seed: string }> {
  const seed = `${accountId ?? "guest"}|${riyadhDay(now)}`;
  if (!accountId) return { signal: EMPTY_SIGNAL, seed };
  const [profile, entries, reviews] = await Promise.all([
    prisma.mobileProfile.findUnique({ where: { accountId }, select: { tastePrefs: true, brewPrefs: true } }),
    prisma.mobileCollectionEntry.findMany({ where: { accountId }, select: { lotId: true, owned: true }, take: 500 }),
    prisma.review.findMany({
      where: { userId: accountId, status: "PUBLISHED", rating: { gte: 4 } },
      select: { coffeeLot: { select: { flavorNotes: true } } }, take: 300,
    }),
  ]);
  const collected = entries.length
    ? await prisma.coffeeLot.findMany({ where: { id: { in: entries.map((e) => e.lotId) } }, select: { flavorNotes: true } })
    : [];
  return {
    seed,
    signal: buildSignal({
      tastePrefs: profile?.tastePrefs ?? [],
      brewPrefs: profile?.brewPrefs ?? [],
      likedNotes: [...collected.map((c) => c.flavorNotes), ...reviews.map((r) => r.coffeeLot.flavorNotes)],
      owned: entries.filter((e) => e.owned).map((e) => e.lotId),
    }),
  };
}
