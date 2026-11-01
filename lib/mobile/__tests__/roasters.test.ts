import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { listRoasters, roasterPage, setRoasterFollow, tally, weightedRating } from "../roasters";
import { originsMap } from "../origins";

const lot = (id: string, over: Record<string, unknown> = {}) => ({
  id, slug: id, name: id, nameAr: id, process: "WASHED", processLabel: null, flavorNotes: ["خوخ"], roastLevel: null,
  averageRating: 4, reviewCount: 2, imageUrl: `https://x/${id}.png`, publishedAt: new Date("2026-10-01"),
  roaster: { nameAr: "ر", name: "r", slug: "r" }, originCountry: { nameAr: "إثيوبيا", isoCode: "ET" }, ...over,
});

describe("weightedRating / tally", () => {
  it("weights by reviews", () => {
    expect(weightedRating([{ averageRating: 5, reviewCount: 1 }, { averageRating: 4, reviewCount: 9 }])).toEqual({ rating: 4.1, reviews: 10 });
    expect(weightedRating([{ averageRating: 0, reviewCount: 0 }])).toEqual({ rating: 0, reviews: 0 });
  });
  it("counts most common first", () => {
    expect(tally(["a", "b", "a"])).toEqual([{ key: "a", count: 2 }, { key: "b", count: 1 }]);
  });
});

describe("roasters", () => {
  it("lists roasters with stats and which the viewer follows", async () => {
    const db = {
      roaster: { findMany: vi.fn().mockResolvedValue([
        { id: "1", slug: "a", nameAr: "أ", name: "A", cityAr: null, coffeeLots: [lot("x"), lot("y", { imageUrl: null, reviewCount: 0 })] },
        { id: "2", slug: "b", nameAr: "ب", name: "B", cityAr: "الرياض", coffeeLots: [lot("z")] },
      ]) },
      mobileRoasterFollow: {
        groupBy: vi.fn().mockResolvedValue([{ roasterId: "2", _count: { _all: 3 } }]),
        findMany: vi.fn().mockResolvedValue([{ roasterId: "2" }]),
      },
    } as unknown as PrismaClient;
    const res = await listRoasters(db, "acc", "https://bunnlist.com");
    expect(res.roasters.map((r) => r.slug)).toEqual(["a", "b"]);
    expect(res.roasters[0]).toMatchObject({ lots: 2, averageRating: 4, reviews: 2, images: ["https://x/x.png"], followers: 0 });
    expect(res.roasters[1].followers).toBe(3);
    expect(res.following).toEqual(["b"]);
    expect(res.roasters[0].logoUrl).toBeNull();
  });

  it("builds a roaster page", async () => {
    const rows = [
      lot("old", { publishedAt: new Date("2026-01-01"), flavorNotes: ["كاكاو", "شوكولاتة"] }),
      lot("new", { publishedAt: new Date("2026-10-20"), reviewCount: 0, process: "NATURAL", originCountry: { nameAr: "مزيج", isoCode: "XB" } }),
    ];
    const db = {
      roaster: { findUnique: vi.fn().mockResolvedValue({ id: "1", slug: "r", nameAr: "ر", name: "r", cityAr: null }) },
      coffeeLot: { findMany: vi.fn().mockResolvedValue(rows) },
      mobileRoasterFollow: { count: vi.fn().mockResolvedValue(4), findUnique: vi.fn().mockResolvedValue({ accountId: "acc" }) },
    } as unknown as PrismaClient;
    const page = await roasterPage(db, "r", "acc");
    expect(page.isFollowing).toBe(true);
    expect(page.roaster.followers).toBe(4);
    expect(page.origins).toEqual([{ key: "إثيوبيا", count: 1 }]);
    expect(page.families.map((f) => f.key)).toEqual(["chocolate", "stoneFruit"].sort((a, b) => a.localeCompare(b)));
    expect(page.topRated.map((l) => l.slug)).toEqual(["old"]);
    expect(page.newest.map((l) => l.slug)).toEqual(["new", "old"]);
    expect(page.lots[0].roasterSlug).toBe("r");
  });

  it("follows and unfollows", async () => {
    const m = {
      roaster: { findUnique: vi.fn().mockResolvedValue({ id: "1" }) },
      mobileRoasterFollow: { upsert: vi.fn(), deleteMany: vi.fn(), count: vi.fn().mockResolvedValue(1) },
    };
    const db = m as unknown as PrismaClient;
    expect(await setRoasterFollow(db, "acc", "r", true)).toEqual({ following: true, followers: 1 });
    expect(m.mobileRoasterFollow.upsert).toHaveBeenCalled();
    await setRoasterFollow(db, "acc", "r", false);
    expect(m.mobileRoasterFollow.deleteMany).toHaveBeenCalledWith({ where: { accountId: "acc", roasterId: "1" } });
    m.roaster.findUnique.mockResolvedValue(null);
    await expect(setRoasterFollow(db, "acc", "x", true)).rejects.toMatchObject({ code: "unprocessable" });
  });
});

describe("originsMap", () => {
  it("groups by country with what the viewer tried", async () => {
    const o = (code: string, nameAr: string) => ({ isoCode: code, nameAr, nameEn: null });
    const db = {
      coffeeLot: { findMany: vi.fn().mockResolvedValue([
        { id: "1", roasterId: "a", process: "WASHED", flavorNotes: ["توت"], regionAr: "قوجي", region: null, averageRating: 4.5, reviewCount: 2, originCountry: o("ET", "إثيوبيا") },
        { id: "2", roasterId: "b", process: "NATURAL", flavorNotes: ["ياسمين"], regionAr: null, region: "Guji", averageRating: 4, reviewCount: 2, originCountry: o("ET", "إثيوبيا") },
        { id: "3", roasterId: "a", process: "WASHED", flavorNotes: [], regionAr: null, region: null, averageRating: 0, reviewCount: 0, originCountry: o("CO", "كولومبيا") },
      ]) },
      mobileCollectionEntry: { findMany: vi.fn().mockResolvedValue([{ lotId: "2" }]) },
      review: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;
    const res = await originsMap(db, "acc");
    expect(res.origins.map((x) => x.code)).toEqual(["ET", "CO"]);
    expect(res.origins[0]).toMatchObject({ lots: 2, roasters: 2, averageRating: 4.3, tried: 1, regions: ["Guji", "قوجي"] });
    expect(res.triedCountries).toBe(1);
    const guest = await originsMap(db, null);
    expect(guest.origins[0].tried).toBeNull();
    expect(guest.triedCountries).toBeNull();
  });
});

describe("roasterLogoUrl", () => {
  it("points at the bundled file", async () => {
    const { roasterLogoUrl, ROASTER_LOGOS } = await import("../roasterLogos");
    expect(Object.keys(ROASTER_LOGOS).length).toBeGreaterThan(30);
    expect(roasterLogoUrl("kof", "https://bunnlist.com/")).toBe("https://bunnlist.com/roasters/kof.png");
    expect(roasterLogoUrl("nope", "https://bunnlist.com")).toBeNull();
    expect(roasterLogoUrl("kof", null)).toBeNull();
  });
});
