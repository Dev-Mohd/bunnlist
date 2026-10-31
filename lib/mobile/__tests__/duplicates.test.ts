import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { dismissDuplicate, findDuplicates, mergeLots, nameTokens, sameness } from "../duplicates";

const same = (a: [string, string], b: [string, string]) => sameness(nameTokens(...a), nameTokens(...b));

describe("sameness", () => {
  it("matches the same coffee across Arabic and English names", () => {
    expect(same(["Brazil Diamond", "Brazil Diamond"], ["دايموند البرازيل", "Diamond Brazil"])).toBeGreaterThanOrEqual(0.8);
    expect(same(["Colombia grape", "Colombia Grape"], ["عنب كولومبيا", "Inab Colombia"])).toBeGreaterThanOrEqual(0.5);
    expect(same(["Villa rica", "Villa Rica"], ["فيلا ريكا كولومبيا", "Villa Rica Colombia"])).toBeGreaterThanOrEqual(0.5);
    expect(same(["Colombia Peach Honey with Peach", "Colombia Peach Honey with Peach"], ["خوخ عسلي", "Khokh Asali"])).toBeGreaterThanOrEqual(0.5);
    expect(same(["تشيلشيلي", "Chilchili"], ["أثيوبيا - تشيلشيللي جرام", "Ethiopia Chelchele Gram"])).toBeGreaterThanOrEqual(0.5);
    expect(same(["بلوبيري - اندونيسيا - انفيوجن", "Blueberry"], ["بلو بيري - إندونيسيا", "Blue Berry - Indonesia"])).toBeGreaterThanOrEqual(0.5);
    expect(same(["ويفر البرازيلي", "Wafer Al Brazili"], ["ويـفر البرازيل", "Wafer Brazil"])).toBeGreaterThanOrEqual(0.5);
    expect(same(["Costa Rica", "Costa Rica"], ["كوستاريكا المانجو", "Costa Rica Al Mango"])).toBeGreaterThanOrEqual(0.5);
  });

  it("doesn't match two coffees that only share a country or a process", () => {
    expect(same(["فراولة كولومبيا", "Strawberry Colombia"], ["خوخ كولومبيا", "Peach Colombia"])).toBe(0);
    expect(same(["قوجي هامبيلا اثيوبيا", "Guji Hambela Ethiopia"], ["شيلشلي اثيوبيا", "Chelchele Ethiopia"])).toBe(0);
    expect(same(["فراولة عسلي", "Farawla Asali"], ["خوخ عسلي", "Khokh Asali"])).toBe(0);
  });
});

const lot = (id: string, nameAr: string, name: string, over: Record<string, unknown> = {}) => ({
  id, slug: id, nameAr, name, imageUrl: null, process: "OTHER", flavorNotes: [], roasterId: "r1",
  roaster: { nameAr: "محمصة ضحى" }, originCountry: { isoCode: "BR", nameAr: "البرازيل" }, ...over,
});

describe("findDuplicates", () => {
  const db = (lots: unknown[], dismissed: unknown[] = []) => ({
    coffeeLot: { findMany: vi.fn().mockResolvedValue(lots) },
    mobileDuplicateDismissal: { findMany: vi.fn().mockResolvedValue(dismissed) },
    review: { groupBy: vi.fn().mockResolvedValue([{ coffeeLotId: "b", _count: { _all: 2 } }]) },
    mobileBrewExperience: { groupBy: vi.fn().mockResolvedValue([]) },
    mobileRecipe: { groupBy: vi.fn().mockResolvedValue([]) },
    mobileCollectionEntry: { groupBy: vi.fn().mockResolvedValue([]) },
  }) as unknown as PrismaClient;

  it("pairs a roaster's duplicates, suggests keeping the one people use, and skips dismissed pairs and other roasters", async () => {
    const lots = [
      lot("a", "Brazil Diamond", "Brazil Diamond", { imageUrl: "x" }), lot("b", "دايموند البرازيل", "Diamond Brazil"),
      lot("c", "دايموند البرازيل", "Diamond Brazil", { roasterId: "r2" }),
      lot("d", "Uganda (Mama)", "Uganda (Mama)", { originCountry: { isoCode: "UG", nameAr: "أوغندا" } }),
      lot("e", "أوغندا ماما", "Uganda Mama", { originCountry: { isoCode: "UG", nameAr: "أوغندا" } }),
    ];
    const pairs = await findDuplicates(db(lots, [{ lotA: "d", lotB: "e" }]));
    expect(pairs).toHaveLength(1);
    expect([pairs[0].a.id, pairs[0].b.id].sort()).toEqual(["a", "b"]);
    expect(pairs[0].keepId).toBe("b");
  });

  it("never pairs two different single origins", async () => {
    const pairs = await findDuplicates(db([
      lot("a", "قوجي اثيوبيا", "Guji Ethiopia", { originCountry: { isoCode: "ET", nameAr: "إثيوبيا" } }),
      lot("b", "قوجي", "Guji", { originCountry: { isoCode: "CO", nameAr: "كولومبيا" } }),
    ]));
    expect(pairs).toHaveLength(0);
  });
});

describe("mergeLots", () => {
  it("fills gaps, moves people's records, keeps one review per person, combines shelves, and redirects the slug", async () => {
    const base = { roasterId: "r1", descriptionAr: null, regionAr: null, region: null, variety: null, altitudeMeters: null, roastLevel: null, storedImageUrl: null, imageType: "NONE" };
    const keep = { ...base, id: "k", slug: "doha-diamond", process: "OTHER", flavorNotes: [], imageUrl: null, originCountryId: "xb", originCountry: { isoCode: "XB" } };
    const drop = { ...base, id: "d", slug: "doha-brazil-diamond", process: "NATURAL", flavorNotes: ["كراميل"], imageUrl: "https://x/d.jpg", imageType: "USER_UPLOADED", variety: "كاتواي", originCountryId: "br", originCountry: { isoCode: "BR" } };
    const tx = {
      coffeeLot: { update: vi.fn(), delete: vi.fn() },
      review: {
        findMany: vi.fn().mockResolvedValueOnce([{ userId: "u1" }]).mockResolvedValueOnce([{ id: "r1", userId: "u1" }, { id: "r2", userId: "u2" }]).mockResolvedValue([]),
        delete: vi.fn(), update: vi.fn(),
      },
      mobileCollectionEntry: {
        findMany: vi.fn().mockResolvedValueOnce([{ accountId: "u1", owned: true, favorite: false, wantsToTry: false, tried: false }])
          .mockResolvedValueOnce([{ accountId: "u1", owned: false, favorite: true, wantsToTry: false, tried: true }, { accountId: "u3", owned: true, favorite: false, wantsToTry: false, tried: false }]),
        update: vi.fn(), delete: vi.fn(),
      },
      mobileBrewExperience: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
      mobileRecipe: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      mobileLotTag: { findMany: vi.fn().mockResolvedValue([{ tag: "luxury", note: null }]), createMany: vi.fn(), deleteMany: vi.fn() },
      mobileTrendingOverride: { findUnique: vi.fn().mockResolvedValue(null) },
      importedCoffee: { updateMany: vi.fn() },
      mobileReport: { updateMany: vi.fn() },
      mobileCoffeeSubmission: { updateMany: vi.fn() },
      mobileLotRedirect: { updateMany: vi.fn(), upsert: vi.fn() },
      mobileDuplicateDismissal: { deleteMany: vi.fn() },
      coffeeLotBrewStat: { deleteMany: vi.fn(), upsert: vi.fn() },
    };
    const prisma = {
      coffeeLot: { findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => (where.id === "k" ? keep : drop)) },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    } as unknown as PrismaClient;

    expect(await mergeLots(prisma, "k", "d")).toEqual({ keptSlug: "doha-diamond", moved: 6 });
    expect(tx.coffeeLot.update.mock.calls[0][0].data).toEqual({
      originCountryId: "br", process: "NATURAL", flavorNotes: ["كراميل"], variety: "كاتواي",
      imageUrl: "https://x/d.jpg", storedImageUrl: null, imageType: "USER_UPLOADED",
    });
    expect(tx.review.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
    expect(tx.review.update).toHaveBeenCalledWith({ where: { id: "r2" }, data: { coffeeLotId: "k" } });
    expect(tx.mobileCollectionEntry.update.mock.calls[0][0].data).toEqual({ owned: true, favorite: true, wantsToTry: false, tried: true });
    expect(tx.mobileLotRedirect.upsert).toHaveBeenCalledWith({ where: { fromSlug: "doha-brazil-diamond" }, update: { toLotId: "k" }, create: { fromSlug: "doha-brazil-diamond", toLotId: "k" } });
    expect(tx.mobileCoffeeSubmission.updateMany.mock.calls[0][0].data.status).toBe("ARCHIVED");
    expect(tx.coffeeLot.delete).toHaveBeenCalledWith({ where: { id: "d" } });
  });

  it("refuses coffees of two roasters", async () => {
    const prisma = { coffeeLot: { findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => ({ id: where.id, roasterId: where.id })) } } as unknown as PrismaClient;
    await expect(mergeLots(prisma, "a", "b")).rejects.toMatchObject({ reason: "different_roasters" });
  });
});

describe("dismissDuplicate", () => {
  it("stores the pair in id order", async () => {
    const upsert = vi.fn();
    await dismissDuplicate({ mobileDuplicateDismissal: { upsert } } as unknown as PrismaClient, "z", "a");
    expect(upsert.mock.calls[0][0].create).toEqual({ lotA: "a", lotB: "z" });
  });
});
