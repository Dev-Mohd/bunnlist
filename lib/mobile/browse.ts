import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { LOT_LIST_SELECT, mapLot, type CoffeeLotRow, type MobileLot } from "./catalog";
import { LOT_TAGS } from "./adminConsole";
import { ApiError } from "./errors";
import { FLAVOR_FAMILIES, flavorFamily } from "./flavorFamilies";

// Search & filters for the app's search tab: text, sort, origin, roaster, process,
// brew method, flavor family, tag (luxury / infused / decaf), and the caller's own shelf (owned / not yet /
// favorites). Flavor notes are free text, so the family filter runs in memory
// over the database-filtered set; the catalog is small enough for that.

const PROCESSES = ["NATURAL", "WASHED", "HONEY", "ANAEROBIC", "WET_HULLED", "CARBONIC_MACERATION", "EXPERIMENTAL", "OTHER"] as const;
const METHODS = ["ESPRESSO", "V60", "CHEMEX", "AEROPRESS", "FRENCH_PRESS", "COLD_BREW", "OTHER"] as const;
export const BROWSE_SORTS = ["rating_desc", "rating_asc", "newest", "oldest", "name_asc", "name_desc"] as const;
const MAX_SCAN = 3000;

const csv = <T extends z.ZodType<string, string>>(item: T) =>
  z.string().optional().transform((s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []))
    .pipe(z.array(item).max(40));

export const BrowseQuery = z.object({
  q: z.string().trim().max(80).optional(),
  sort: z.enum(BROWSE_SORTS).default("rating_desc"),
  origins: csv(z.string().max(3)),
  roasters: csv(z.string().max(120)),
  processes: csv(z.enum(PROCESSES)),
  methods: csv(z.enum(METHODS)),
  flavors: csv(z.enum(FLAVOR_FAMILIES)),
  tags: csv(z.enum(LOT_TAGS)),
  shelf: z.enum(["all", "owned", "missing"]).default("all"),
  favorites: z.enum(["0", "1"]).default("0").transform((v) => v === "1"),
  offset: z.coerce.number().int().min(0).max(MAX_SCAN).default(0),
  limit: z.coerce.number().int().min(1).max(60).default(40),
});
export type BrowseQuery = z.infer<typeof BrowseQuery>;

export function parseBrowseQuery(params: URLSearchParams): BrowseQuery {
  const raw: Record<string, string> = {};
  params.forEach((v, k) => { raw[k] = v; });
  const parsed = BrowseQuery.safeParse(raw);
  if (!parsed.success) throw new ApiError("unprocessable", "invalid_query");
  return parsed.data;
}

const ORDER: Record<(typeof BROWSE_SORTS)[number], Prisma.CoffeeLotOrderByWithRelationInput[]> = {
  rating_desc: [{ averageRating: "desc" }, { reviewCount: "desc" }],
  rating_asc: [{ averageRating: "asc" }, { reviewCount: "desc" }],
  newest: [{ publishedAt: "desc" }],
  oldest: [{ publishedAt: "asc" }],
  name_asc: [{ nameAr: "asc" }],
  name_desc: [{ nameAr: "desc" }],
};

export async function browseLots(
  prisma: PrismaClient, query: BrowseQuery, accountId: string | null,
): Promise<{ lots: MobileLot[]; total: number }> {
  const and: Prisma.CoffeeLotWhereInput[] = [{ publishedAt: { not: null } }];
  const q = query.q?.trim();
  if (q && q.length >= 2) {
    and.push({ OR: [
      { nameAr: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { roaster: { nameAr: { contains: q, mode: "insensitive" } } },
      { roaster: { name: { contains: q, mode: "insensitive" } } },
      { originCountry: { nameAr: { contains: q, mode: "insensitive" } } },
    ] });
  }
  if (query.origins.length) and.push({ originCountry: { isoCode: { in: query.origins } } });
  if (query.roasters.length) and.push({ roaster: { slug: { in: query.roasters } } });
  if (query.processes.length) and.push({ process: { in: [...query.processes] } });
  if (query.methods.length) and.push({ recommendedBrewMethods: { hasSome: [...query.methods] } });
  if (query.tags.length) {
    const tagged = await prisma.mobileLotTag.findMany({ where: { tag: { in: [...query.tags] } }, select: { lotId: true } });
    and.push({ id: { in: tagged.map((t) => t.lotId) } });
  }

  if (query.shelf !== "all" || query.favorites) {
    if (!accountId) throw new ApiError("unauthorized");
    const entries = await prisma.mobileCollectionEntry.findMany({
      where: { accountId }, select: { lotId: true, owned: true, favorite: true },
    });
    const owned = entries.filter((e) => e.owned).map((e) => e.lotId);
    if (query.shelf === "owned") and.push({ id: { in: owned } });
    if (query.shelf === "missing") and.push({ id: { notIn: owned } });
    if (query.favorites) and.push({ id: { in: entries.filter((e) => e.favorite).map((e) => e.lotId) } });
  }

  const rows = await prisma.coffeeLot.findMany({
    where: { AND: and }, orderBy: [...ORDER[query.sort], { id: "asc" }], take: MAX_SCAN, select: LOT_LIST_SELECT,
  });
  const families = new Set<string>(query.flavors);
  const matching = families.size
    ? rows.filter((r) => r.flavorNotes.some((n) => families.has(flavorFamily(n))))
    : rows;
  return {
    total: matching.length,
    lots: matching.slice(query.offset, query.offset + query.limit).map((r) => mapLot(r as unknown as CoffeeLotRow)),
  };
}

export interface Facet { value: string; labelAr: string; count: number }
export interface BrowseFacets {
  origins: Facet[]; roasters: Facet[]; processes: Facet[]; methods: Facet[]; flavors: Facet[];
}

/** What the filter sheet offers, with how many published coffees each has. */
export async function browseFacets(prisma: PrismaClient): Promise<BrowseFacets> {
  const rows = await prisma.coffeeLot.findMany({
    where: { publishedAt: { not: null } },
    take: MAX_SCAN,
    select: {
      process: true, processLabel: true, flavorNotes: true, recommendedBrewMethods: true,
      roaster: { select: { slug: true, nameAr: true } },
      originCountry: { select: { isoCode: true, nameAr: true } },
    },
  });
  const tally = () => new Map<string, Facet>();
  const add = (m: Map<string, Facet>, value: string, labelAr: string) => {
    const f = m.get(value);
    if (f) f.count += 1; else m.set(value, { value, labelAr, count: 1 });
  };
  const origins = tally(), roasters = tally(), processes = tally(), methods = tally(), flavors = tally();
  for (const r of rows) {
    if (r.originCountry) add(origins, r.originCountry.isoCode, r.originCountry.nameAr);
    if (r.roaster) add(roasters, r.roaster.slug, r.roaster.nameAr);
    add(processes, r.process, r.process);
    for (const m of new Set(r.recommendedBrewMethods)) add(methods, m, m);
    const fams = new Set(r.flavorNotes.map(flavorFamily).filter((f) => f !== "other"));
    for (const f of fams) add(flavors, f, f);
  }
  const sorted = (m: Map<string, Facet>) => [...m.values()].sort((a, b) => b.count - a.count || a.labelAr.localeCompare(b.labelAr, "ar"));
  return {
    origins: sorted(origins), roasters: sorted(roasters), processes: sorted(processes),
    methods: sorted(methods), flavors: sorted(flavors),
  };
}
