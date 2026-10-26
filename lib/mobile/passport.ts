import type { PrismaClient } from "@prisma/client";

// "جواز القهوة": a stamp for every origin someone has tasted, plus badges for
// breadth (countries, regions, processes) and for special coffees. A coffee
// counts once it is in their collection as owned or tried, rated, or brewed.

export const REGIONS: Record<string, { code: string; nameAr: string }> = {};
const regionOf = (code: string, nameAr: string, isos: string[]) => isos.forEach((iso) => { REGIONS[iso] = { code, nameAr }; });
regionOf("africa", "أفريقيا", ["ET", "KE", "RW", "BI", "UG", "TZ", "ZM", "MW", "CD"]);
regionOf("americas", "أمريكا اللاتينية", ["CO", "BR", "PA", "SV", "GT", "HN", "CR", "PE", "MX", "NI", "EC", "BO", "JM"]);
regionOf("arabia", "الجزيرة العربية", ["YE", "SA"]);
regionOf("asia", "آسيا والمحيط الهادئ", ["ID", "IN", "NP", "CN", "VN", "TH", "PG"]);
export const REGION_COUNT = 4;

const MAIN_PROCESSES = ["NATURAL", "WASHED", "HONEY", "ANAEROBIC"];

export interface TastedLot {
  lotId: string;
  at: Date;
  process: string;
  variety: string | null;
  origin: { code: string; nameAr: string } | null;
  tags: string[];
}

export interface Stamp { code: string; nameAr: string; region: string | null; count: number; firstAt: string }
export interface Badge { id: string; titleAr: string; detailAr: string; icon: string; current: number; goal: number; earned: boolean }
export interface Passport {
  coffees: number;
  countries: number;
  regions: number;
  processes: number;
  stamps: Stamp[];
  badges: Badge[];
}

const badge = (id: string, titleAr: string, detailAr: string, icon: string, current: number, goal: number): Badge =>
  ({ id, titleAr, detailAr, icon, current: Math.min(current, goal), goal, earned: current >= goal });

export function buildPassport(tasted: TastedLot[]): Passport {
  const byOrigin = new Map<string, Stamp>();
  for (const t of [...tasted].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    if (!t.origin || t.origin.code === "XB") continue;
    const s = byOrigin.get(t.origin.code);
    if (s) s.count += 1;
    else byOrigin.set(t.origin.code, {
      code: t.origin.code, nameAr: t.origin.nameAr, region: REGIONS[t.origin.code]?.code ?? null, count: 1, firstAt: t.at.toISOString(),
    });
  }
  const stamps = [...byOrigin.values()];
  const regions = new Set(stamps.map((s) => s.region).filter(Boolean)).size;
  const processes = new Set(tasted.map((t) => t.process).filter((p) => MAIN_PROCESSES.includes(p)));
  const yemen = byOrigin.get("YE")?.count ?? 0;
  const gesha = tasted.filter((t) => /gesha|geisha|قيشا|جيشا/i.test(t.variety ?? "")).length;
  const luxury = tasted.filter((t) => t.tags.includes("luxury")).length;
  const infused = tasted.filter((t) => t.tags.includes("infused")).length;

  return {
    coffees: tasted.length,
    countries: stamps.length,
    regions,
    processes: processes.size,
    stamps,
    badges: [
      badge("first-stamp", "أول ختم", "جرّب قهوة من أي بلد", "seal.fill", stamps.length, 1),
      badge("explorer", "مستكشف", "قهوات من ٥ بلدان", "map.fill", stamps.length, 5),
      badge("traveler", "رحّالة", "قهوات من ١٠ بلدان", "airplane", stamps.length, 10),
      badge("continents", "حول العالم", "قهوة من كل منطقة: أفريقيا، أمريكا اللاتينية، الجزيرة العربية، آسيا", "globe.europe.africa.fill", regions, REGION_COUNT),
      badge("processes", "كل المعالجات", "مجففة ومغسولة وعسلية ولاهوائية", "drop.triangle.fill", processes.size, MAIN_PROCESSES.length),
      badge("yemeni", "أصل البن", "٣ قهوات يمنية", "mountain.2.fill", yemen, 3),
      badge("gesha", "قيشا أولى", "جرّب قهوة من سلالة القيشا", "sparkles", gesha, 1),
      badge("luxury", "ذوق رفيع", "٣ قهوات فاخرة", "crown.fill", luxury, 3),
      badge("infused", "مغامر", "جرّب قهوة منقوعة", "flask.fill", infused, 1),
      badge("fifty", "خمسين كيس", "٥٠ قهوة مختلفة", "square.stack.3d.up.fill", tasted.length, 50),
    ],
  };
}

export async function passport(prisma: PrismaClient, accountId: string): Promise<Passport> {
  const [collection, reviews, brews] = await Promise.all([
    prisma.mobileCollectionEntry.findMany({
      where: { accountId, OR: [{ owned: true }, { tried: true }] }, select: { lotId: true, createdAt: true },
    }),
    prisma.review.findMany({ where: { userId: accountId, status: "PUBLISHED" }, select: { coffeeLotId: true, createdAt: true } }),
    prisma.mobileBrewExperience.findMany({
      where: { accountId, state: { not: "deleted" } }, select: { lotId: true, brewedAt: true },
    }),
  ]);
  const first = new Map<string, Date>();
  const note = (id: string, at: Date) => {
    const prev = first.get(id);
    if (!prev || at < prev) first.set(id, at);
  };
  collection.forEach((c) => note(c.lotId, c.createdAt));
  reviews.forEach((r) => note(r.coffeeLotId, r.createdAt));
  brews.forEach((b) => note(b.lotId, b.brewedAt));
  const ids = [...first.keys()];
  if (ids.length === 0) return buildPassport([]);

  const [lots, tags] = await Promise.all([
    prisma.coffeeLot.findMany({
      where: { id: { in: ids }, publishedAt: { not: null } },
      select: { id: true, process: true, variety: true, originCountry: { select: { isoCode: true, nameAr: true } } },
    }),
    prisma.mobileLotTag.findMany({ where: { lotId: { in: ids } }, select: { lotId: true, tag: true } }),
  ]);
  const tagsBy = new Map<string, string[]>();
  tags.forEach((t) => tagsBy.set(t.lotId, [...(tagsBy.get(t.lotId) ?? []), t.tag]));
  return buildPassport(lots.map((l) => ({
    lotId: l.id,
    at: first.get(l.id) as Date,
    process: l.process,
    variety: l.variety,
    origin: l.originCountry ? { code: l.originCountry.isoCode, nameAr: l.originCountry.nameAr } : null,
    tags: tagsBy.get(l.id) ?? [],
  })));
}
