import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { refreshReviewStats } from "./reviews";

// The same coffee published twice (a reseller's listing and the roaster's own,
// one named in Arabic, one in English): found by name within a roaster, then
// merged by the admin: the one kept takes the other's missing details, its
// reviews, brews, recipes, shelves and tags, and the other's link points to it.

const BLEND = "XB";

/** Arabic and English words for the same thing, so "عنب كولومبيا" meets "Colombia Grape". */
const SAME: Record<string, string> = {
  "البرازيل": "brazil", "برازيل": "brazil", "برازيلي": "brazil", "كولومبيا": "colombia", "كولومبي": "colombia",
  "اثيوبيا": "ethiopia", "اثيوبي": "ethiopia", "اثيوبيه": "ethiopia", "كينيا": "kenya", "اليمن": "yemen", "يمني": "yemen",
  "السعوديه": "saudi", "سعودي": "saudi", "رواندا": "rwanda", "بوروندي": "burundi", "اوغندا": "uganda", "اندونيسيا": "indonesia",
  "اندونسيا": "indonesia", "كوستاريكا": "costa rica", "بنما": "panama", "باناما": "panama", "غواتيمالا": "guatemala",
  "قواتيمالا": "guatemala", "هندوراس": "honduras", "السلفادور": "salvador", "سلفادور": "salvador", "نيكاراغوا": "nicaragua",
  "المكسيك": "mexico", "بيرو": "peru", "البيرو": "peru", "الهند": "india", "تنزانيا": "tanzania",
  "عنب": "grape", "فراوله": "strawberry", "خوخ": "peach", "بطيخ": "watermelon", "مانجو": "mango", "المانجو": "mango",
  "شمام": "melon", "كرز": "cherry", "موهيتو": "mojito", "ديكاف": "decaf", "عسلي": "honey", "عسليه": "honey",
  "مجفف": "natural", "مجففه": "natural", "مغسول": "washed", "مغسوله": "washed", "دايموند": "diamond", "ماما": "mama",
  "فيلا": "villa", "ريكا": "rica", "تشيلشيلي": "chelchele", "شيلشيلي": "chelchele", "تشيلشيللي": "chelchele", "شلشلي": "chelchele",
  "حراز": "haraz", "قوجي": "guji", "جوجي": "guji", "هويلا": "huila", "سيدامو": "sidamo", "يرقاتشيف": "yirgacheffe",
  "بلوبيري": "blue berry", "blueberry": "blue berry", "اوغندي": "uganda", "اوغنديه": "uganda", "كولومبيه": "colombia", "بلو": "blue", "بيري": "berry", "كوكونت": "coconut", "رازبيري": "raspberry", "جوكر": "joker",
  "الجوكر": "joker", "فانيلا": "vanilla", "كيت": "kit", "كات": "kat", "كت": "kit",
  // The Latin spellings the namer gives Arabic names.
  "asali": "honey", "khokh": "peach", "farawla": "strawberry", "inab": "grape", "batikh": "watermelon", "shamam": "melon",
  "mishmish": "apricot", "مشمش": "apricot", "chilchili": "chelchele", "shilshili": "chelchele", "shalshali": "chelchele",
  "شيلشلي": "chelchele", "qoji": "guji", "هامبيلا": "hambela", "hambella": "hambela", "mazeej": "blend", "مزيج": "blend",
};
const COUNTRIES = new Set(["brazil", "colombia", "ethiopia", "kenya", "yemen", "saudi", "rwanda", "burundi", "uganda", "indonesia",
  "costa", "rica", "costa rica", "panama", "guatemala", "honduras", "salvador", "el", "nicaragua", "mexico", "peru", "india", "tanzania"]);
const STOP = new Set(["قهوه", "محمصه", "محصول", "جرام", "غرام", "coffee", "roastery", "the", "g", "kg", "with", "من", "مع", "al", "ال",
  "natural", "washed", "honey", "gram", "1kg", "blend"]);

function norm(s: string): string {
  return s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْـ]/g, "");
}

/** A coffee's name words from both its names, with Arabic mapped to English where we know the word. */
export function nameTokens(nameAr: string, name: string): Set<string> {
  const out = new Set<string>();
  for (const raw of `${norm(nameAr)} ${norm(name)}`.split(/[^\p{L}\p{N}]+/u)) {
    if (!raw || /^\d+$/.test(raw) || /^\d+(g|kg|جم)$/.test(raw)) continue;
    const word = SAME[raw] ?? SAME[raw.replace(/^ال/, "")] ?? raw;
    for (const w of word.split(" ")) if (w.length > 1 && !STOP.has(w)) out.add(w);
  }
  return out;
}

/** 0–1: how likely two coffees of one roaster are the same; at least one shared word that isn't a country. */
export function sameness(a: Set<string>, b: Set<string>): number {
  const shared = [...a].filter((t) => b.has(t));
  const meaningful = shared.filter((t) => !COUNTRIES.has(t));
  const onlyCountries = (s: Set<string>) => [...s].every((t) => COUNTRIES.has(t));
  // "Costa Rica" alone against "كوستاريكا المانجو": a bare country name inside the other's.
  if (meaningful.length === 0) return shared.length > 0 && (onlyCountries(a) || onlyCountries(b)) ? 0.6 : 0;
  const jaccard = shared.length / new Set([...a, ...b]).size;
  const contained = shared.length === Math.min(a.size, b.size) ? 0.8 : 0;
  return Math.max(jaccard, contained);
}

export interface DuplicateSide {
  id: string; slug: string; nameAr: string; name: string; imageUrl: string | null;
  originName: string | null; process: string; flavorNotes: string[];
  /** People's records on it: reviews, brews, recipes, shelves. */
  used: number;
}

export interface DuplicatePair {
  roaster: string;
  score: number;
  a: DuplicateSide;
  b: DuplicateSide;
  /** The one to keep: more people's records, a photo, details, an Arabic-script name. */
  keepId: string;
}

const LOT_SELECT = {
  id: true, slug: true, nameAr: true, name: true, imageUrl: true, process: true, flavorNotes: true, roasterId: true,
  roaster: { select: { nameAr: true } }, originCountry: { select: { isoCode: true, nameAr: true } },
} as const;

const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

/** Likely duplicates among published coffees, roaster by roaster, best match first. */
export async function findDuplicates(prisma: PrismaClient, minScore = 0.5): Promise<DuplicatePair[]> {
  const [lots, dismissed] = await Promise.all([
    prisma.coffeeLot.findMany({ where: { publishedAt: { not: null } }, select: LOT_SELECT }),
    prisma.mobileDuplicateDismissal.findMany({ select: { lotA: true, lotB: true } }),
  ]);
  const skip = new Set(dismissed.map((d) => pairKey(d.lotA, d.lotB)));
  const byRoaster = new Map<string, typeof lots>();
  for (const l of lots) byRoaster.set(l.roasterId, [...(byRoaster.get(l.roasterId) ?? []), l]);

  const found: { score: number; a: (typeof lots)[number]; b: (typeof lots)[number] }[] = [];
  for (const group of byRoaster.values()) {
    const tokens = group.map((l) => nameTokens(l.nameAr, l.name));
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i], b = group[j];
      if (skip.has(pairKey(a.id, b.id))) continue;
      const oa = a.originCountry?.isoCode, ob = b.originCountry?.isoCode;
      // Two single origins that differ are two coffees, whatever the names say.
      if (oa && ob && oa !== ob && oa !== BLEND && ob !== BLEND) continue;
      const score = sameness(tokens[i], tokens[j]);
      if (score >= minScore) found.push({ score, a, b });
    }
  }
  const ids = [...new Set(found.flatMap((f) => [f.a.id, f.b.id]))];
  const used = await usage(prisma, ids);
  const side = (l: (typeof lots)[number]): DuplicateSide => ({
    id: l.id, slug: l.slug, nameAr: l.nameAr, name: l.name, imageUrl: l.imageUrl,
    originName: l.originCountry && l.originCountry.isoCode !== BLEND ? l.originCountry.nameAr : null,
    process: l.process, flavorNotes: l.flavorNotes, used: used.get(l.id) ?? 0,
  });
  const worth = (s: DuplicateSide) => s.used * 10 + (s.imageUrl ? 3 : 0) + (s.originName ? 1 : 0) + (s.process !== "OTHER" ? 1 : 0)
    + Math.min(s.flavorNotes.length, 3) + (/[؀-ۿ]/.test(s.nameAr) ? 2 : 0);
  return found.sort((x, y) => y.score - x.score).map((f) => {
    const a = side(f.a), b = side(f.b);
    return { roaster: f.a.roaster?.nameAr ?? "", score: Math.round(f.score * 100) / 100, a, b, keepId: worth(b) > worth(a) ? b.id : a.id };
  });
}

/** How many of people's records point at each coffee. */
async function usage(prisma: PrismaClient, ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const [reviews, brews, recipes, shelves] = await Promise.all([
    prisma.review.groupBy({ by: ["coffeeLotId"], where: { coffeeLotId: { in: ids } }, _count: { _all: true } }),
    prisma.mobileBrewExperience.groupBy({ by: ["lotId"], where: { lotId: { in: ids } }, _count: { _all: true } }),
    prisma.mobileRecipe.groupBy({ by: ["lotId"], where: { lotId: { in: ids } }, _count: { _all: true } }),
    prisma.mobileCollectionEntry.groupBy({ by: ["lotId"], where: { lotId: { in: ids } }, _count: { _all: true } }),
  ]);
  const out = new Map<string, number>();
  const add = (id: string | null, n: number) => { if (id) out.set(id, (out.get(id) ?? 0) + n); };
  for (const r of reviews) add(r.coffeeLotId, r._count._all);
  for (const r of brews) add(r.lotId, r._count._all);
  for (const r of recipes) add(r.lotId, r._count._all);
  for (const r of shelves) add(r.lotId, r._count._all);
  return out;
}

export const MergeRequest = z.object({ keepId: z.string().min(1), dropId: z.string().min(1) }).refine((r) => r.keepId !== r.dropId);
export const DismissRequest = z.object({ lotA: z.string().min(1), lotB: z.string().min(1) }).refine((r) => r.lotA !== r.lotB);

/** Says two coffees are different, so they aren't offered as duplicates again. */
export async function dismissDuplicate(prisma: PrismaClient, a: string, b: string): Promise<{ dismissed: true }> {
  const [lotA, lotB] = a < b ? [a, b] : [b, a];
  await prisma.mobileDuplicateDismissal.upsert({ where: { lotA_lotB: { lotA, lotB } }, update: {}, create: { lotA, lotB } });
  return { dismissed: true };
}

type Tx = Prisma.TransactionClient;

/**
 * Merges `dropId` into `keepId`: fills the kept coffee's gaps from the other,
 * moves every record that points at it, sends its slug to the kept one, and
 * removes it. Where a person has the same kind of record on both (a review, a
 * shelf entry), the kept coffee's stays and the shelves are combined.
 */
export async function mergeLots(prisma: PrismaClient, keepId: string, dropId: string): Promise<{ keptSlug: string; moved: number }> {
  const select = {
    id: true, slug: true, roasterId: true, process: true, flavorNotes: true, descriptionAr: true, regionAr: true, region: true,
    variety: true, altitudeMeters: true, roastLevel: true, imageUrl: true, storedImageUrl: true, imageType: true,
    originCountryId: true, originCountry: { select: { isoCode: true } },
  } as const;
  const [keep, drop] = await Promise.all([
    prisma.coffeeLot.findUnique({ where: { id: keepId }, select }),
    prisma.coffeeLot.findUnique({ where: { id: dropId }, select }),
  ]);
  if (!keep || !drop) throw ApiError.unprocessable("lot_not_found");
  if (keep.roasterId !== drop.roasterId) throw ApiError.unprocessable("different_roasters");

  const fill: Prisma.CoffeeLotUncheckedUpdateInput = {};
  if (keep.originCountry?.isoCode === BLEND && drop.originCountry?.isoCode && drop.originCountry.isoCode !== BLEND) fill.originCountryId = drop.originCountryId;
  if (keep.process === "OTHER" && drop.process !== "OTHER") fill.process = drop.process;
  if (keep.flavorNotes.length === 0 && drop.flavorNotes.length) fill.flavorNotes = drop.flavorNotes;
  if (!keep.descriptionAr && drop.descriptionAr) fill.descriptionAr = drop.descriptionAr;
  if (!keep.regionAr && !keep.region && (drop.regionAr || drop.region)) { fill.regionAr = drop.regionAr; fill.region = drop.region; }
  if (!keep.variety && drop.variety) fill.variety = drop.variety;
  if (keep.altitudeMeters == null && drop.altitudeMeters != null) fill.altitudeMeters = drop.altitudeMeters;
  if (!keep.roastLevel && drop.roastLevel) fill.roastLevel = drop.roastLevel;
  if (!keep.imageUrl && drop.imageUrl) { fill.imageUrl = drop.imageUrl; fill.storedImageUrl = drop.storedImageUrl; fill.imageType = drop.imageType; }

  let moved = 0;
  await prisma.$transaction(async (tx: Tx) => {
    if (Object.keys(fill).length) await tx.coffeeLot.update({ where: { id: keepId }, data: fill });

    // Reviews: one per person per coffee; the kept coffee's wins.
    const keptReviewers = new Set((await tx.review.findMany({ where: { coffeeLotId: keepId }, select: { userId: true } })).map((r) => r.userId));
    for (const r of await tx.review.findMany({ where: { coffeeLotId: dropId }, select: { id: true, userId: true } })) {
      if (keptReviewers.has(r.userId)) await tx.review.delete({ where: { id: r.id } });
      else { await tx.review.update({ where: { id: r.id }, data: { coffeeLotId: keepId } }); moved++; }
    }

    // Shelves: one entry per person per coffee; the flags are combined.
    const kept = new Map((await tx.mobileCollectionEntry.findMany({ where: { lotId: keepId } })).map((e) => [e.accountId, e]));
    for (const e of await tx.mobileCollectionEntry.findMany({ where: { lotId: dropId } })) {
      const k = kept.get(e.accountId);
      if (k) {
        await tx.mobileCollectionEntry.update({
          where: { accountId_lotId: { accountId: e.accountId, lotId: keepId } },
          data: { owned: k.owned || e.owned, favorite: k.favorite || e.favorite, wantsToTry: k.wantsToTry || e.wantsToTry, tried: k.tried || e.tried },
        });
        await tx.mobileCollectionEntry.delete({ where: { accountId_lotId: { accountId: e.accountId, lotId: dropId } } });
      } else {
        await tx.mobileCollectionEntry.update({ where: { accountId_lotId: { accountId: e.accountId, lotId: dropId } }, data: { lotId: keepId } });
        moved++;
      }
    }

    moved += (await tx.mobileBrewExperience.updateMany({ where: { lotId: dropId }, data: { lotId: keepId } })).count;
    moved += (await tx.mobileRecipe.updateMany({ where: { lotId: dropId }, data: { lotId: keepId } })).count;
    const tags = await tx.mobileLotTag.findMany({ where: { lotId: dropId } });
    if (tags.length) await tx.mobileLotTag.createMany({ data: tags.map((t) => ({ lotId: keepId, tag: t.tag, note: t.note })), skipDuplicates: true });
    await tx.mobileLotTag.deleteMany({ where: { lotId: dropId } });
    const pin = await tx.mobileTrendingOverride.findUnique({ where: { lotId: dropId } });
    if (pin) {
      await tx.mobileTrendingOverride.delete({ where: { lotId: dropId } });
      if (!(await tx.mobileTrendingOverride.findUnique({ where: { lotId: keepId } }))) {
        await tx.mobileTrendingOverride.create({ data: { lotId: keepId, mode: pin.mode, createdBy: pin.createdBy } });
      }
    }
    await tx.importedCoffee.updateMany({ where: { savedCoffeeLotId: dropId }, data: { savedCoffeeLotId: keepId } });
    await tx.mobileReport.updateMany({ where: { targetType: "lot", targetId: dropId }, data: { targetId: keepId } });
    // Its suggestion is set aside, so a re-import neither brings it back nor touches the kept coffee.
    await tx.mobileCoffeeSubmission.updateMany({
      where: { approvedLotId: dropId }, data: { status: "ARCHIVED", approvedLotId: null, reviewNote: `دُمجت في ${keep.slug}` },
    });
    await tx.mobileLotRedirect.updateMany({ where: { toLotId: dropId }, data: { toLotId: keepId } });
    await tx.mobileLotRedirect.upsert({ where: { fromSlug: drop.slug }, update: { toLotId: keepId }, create: { fromSlug: drop.slug, toLotId: keepId } });
    await tx.mobileDuplicateDismissal.deleteMany({ where: { OR: [{ lotA: dropId }, { lotB: dropId }] } });
    await tx.coffeeLot.delete({ where: { id: dropId } });
    await refreshReviewStats(tx, keepId);
  });
  return { keptSlug: keep.slug, moved };
}

/** A merged-away coffee's slug → the slug of the one that stayed (null when none). */
export async function redirectedSlug(prisma: PrismaClient, slug: string): Promise<string | null> {
  const r = await prisma.mobileLotRedirect.findUnique({ where: { fromSlug: slug } });
  if (!r) return null;
  return (await prisma.coffeeLot.findUnique({ where: { id: r.toLotId }, select: { slug: true } }))?.slug ?? null;
}
