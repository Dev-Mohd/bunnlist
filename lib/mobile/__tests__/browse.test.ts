import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { browseFacets, browseLots, parseBrowseQuery } from "../browse";
import { flavorFamily } from "../flavorFamilies";

const lot = (id: string, notes: string[], over: Record<string, unknown> = {}) => ({
  id, slug: id, name: id, nameAr: id, process: "WASHED", processLabel: null, flavorNotes: notes, roastLevel: null,
  averageRating: 4, reviewCount: 1, imageUrl: null, recommendedBrewMethods: ["V60"],
  roaster: { nameAr: "ر", name: "r", slug: "r" }, originCountry: { nameAr: "إثيوبيا", isoCode: "ET" }, ...over,
});

function fake(rows: ReturnType<typeof lot>[]) {
  const m = {
    coffeeLot: { findMany: vi.fn().mockResolvedValue(rows) },
    mobileCollectionEntry: { findMany: vi.fn().mockResolvedValue([{ lotId: "a", owned: true, favorite: false }]) },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("flavorFamily", () => {
  it("matches the app's families", () => {
    expect(flavorFamily("خوخ")).toBe("stoneFruit");
    expect(flavorFamily("Dark chocolate")).toBe("chocolate");
    expect(flavorFamily("غامض")).toBe("other");
  });
});

describe("browseLots", () => {
  it("parses filters and narrows by flavor family in memory", async () => {
    const { db, m } = fake([lot("a", ["خوخ"]), lot("b", ["شوكولاتة"]), lot("c", ["مشمش", "كاكاو"])]);
    const query = parseBrowseQuery(new URLSearchParams("flavors=stoneFruit&origins=ET&sort=newest&limit=1"));
    const res = await browseLots(db, query, null);
    expect(res.total).toBe(2);
    expect(res.lots.map((l) => l.slug)).toEqual(["a"]);
    const where = m.coffeeLot.findMany.mock.calls[0][0].where.AND;
    expect(where).toContainEqual({ originCountry: { isoCode: { in: ["ET"] } } });
  });

  it("needs an account for shelf filters", async () => {
    const query = parseBrowseQuery(new URLSearchParams("shelf=owned&sort=rating_desc"));
    await expect(browseLots(fake([]).db, query, null)).rejects.toMatchObject({ code: "unauthorized" });
    const { db, m } = fake([]);
    await browseLots(db, query, "acc");
    expect(m.coffeeLot.findMany.mock.calls[0][0].where.AND).toContainEqual({ id: { in: ["a"] } });
  });

  it("rejects unknown values", () => {
    expect(() => parseBrowseQuery(new URLSearchParams("processes=BOILED"))).toThrow();
  });
});

describe("browseFacets", () => {
  it("counts each option", async () => {
    const f = await browseFacets(fake([lot("a", ["خوخ"]), lot("b", ["خوخ", "شوكولاتة"])]).db);
    expect(f.origins).toEqual([{ value: "ET", labelAr: "إثيوبيا", count: 2 }]);
    expect(f.flavors[0]).toEqual({ value: "stoneFruit", labelAr: "stoneFruit", count: 2 });
  });
});
