import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { buildSignal, dailyNoise, EMPTY_SIGNAL, forYouOrder, spreadRoasters, viewerSignal } from "../forYouOrder";
import { browseLots, parseBrowseQuery } from "../browse";

const lot = (id: string, notes: string[], roaster = id, over: Record<string, unknown> = {}) => ({
  id, flavorNotes: notes, recommendedBrewMethods: ["V60"], imageUrl: "x", roaster: { nameAr: roaster }, ...over,
});

describe("forYouOrder", () => {
  const many = Array.from({ length: 30 }, (_, i) => lot(`l${i}`, i % 2 ? ["شوكولاتة"] : ["ليمون"]));

  it("shuffles without a signal, the same all day and different per seed", () => {
    const a = forYouOrder(many, EMPTY_SIGNAL, "u|2026-11-01").map((l) => l.id);
    expect(forYouOrder(many, EMPTY_SIGNAL, "u|2026-11-01").map((l) => l.id)).toEqual(a);
    expect(forYouOrder(many, EMPTY_SIGNAL, "u|2026-11-02").map((l) => l.id)).not.toEqual(a);
    expect(a).not.toEqual(many.map((l) => l.id));
    expect([...a].sort()).toEqual(many.map((l) => l.id).sort());
  });

  it("puts picked families first", () => {
    const signal = buildSignal({ tastePrefs: ["citrus"], brewPrefs: [], likedNotes: [], owned: [] });
    const top = forYouOrder(many, signal, "u|d").slice(0, 10);
    expect(top.filter((l) => l.flavorNotes[0] === "ليمون").length).toBeGreaterThanOrEqual(9);
  });

  it("learns from liked coffees and sinks owned ones", () => {
    const signal = buildSignal({ tastePrefs: [], brewPrefs: [], likedNotes: [["كاكاو"], ["شوكولاتة داكنة"]], owned: ["l1"] });
    const order = forYouOrder(many, signal, "u|d");
    expect(order.slice(0, 10).filter((l) => l.flavorNotes[0] === "شوكولاتة").length).toBeGreaterThanOrEqual(9);
    expect(order.findIndex((l) => l.id === "l1")).toBeGreaterThan(14);
  });

  it("spreads one roaster out of the top", () => {
    const rows = ["a", "a", "a", "a", "b", "c"].map((r, i) => ({ id: `${i}`, r }));
    expect(spreadRoasters(rows, (x) => x.r).map((x) => x.r)).toEqual(["a", "a", "b", "c", "a", "a"]);
  });

  it("noise is in [0, 1)", () => {
    for (const id of ["a", "b", "c"]) expect(dailyNoise("s", id)).toBeGreaterThanOrEqual(0);
    expect(dailyNoise("s", "a")).toBeLessThan(1);
  });
});

describe("viewerSignal", () => {
  it("reads prefs, collection and good ratings", async () => {
    const db = {
      mobileProfile: { findUnique: vi.fn().mockResolvedValue({ tastePrefs: ["floral"], brewPrefs: ["V60"] }) },
      mobileCollectionEntry: { findMany: vi.fn().mockResolvedValue([{ lotId: "x", owned: true }]) },
      review: { findMany: vi.fn().mockResolvedValue([{ coffeeLot: { flavorNotes: ["توت"] } }]) },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([{ flavorNotes: ["خوخ"] }]) },
    } as unknown as PrismaClient;
    const { signal, seed } = await viewerSignal(db, "acc", new Date("2026-11-01T22:00:00Z"));
    expect(seed).toBe("acc|2026-11-02");
    expect(signal.families.get("floral")).toBe(1);
    expect(signal.families.get("berry")).toBeCloseTo(0.7);
    expect(signal.families.get("stoneFruit")).toBeCloseTo(0.7);
    expect(signal.brews.has("V60")).toBe(true);
    expect(signal.owned.has("x")).toBe(true);
  });

  it("guests get the day's shuffle", async () => {
    const { signal, seed } = await viewerSignal({} as PrismaClient, null, new Date("2026-11-01T10:00:00Z"));
    expect(seed).toBe("guest|2026-11-01");
    expect(signal.families.size).toBe(0);
  });
});

describe("browse default", () => {
  it("is the for-you order", async () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      ...lot(`l${i}`, ["خوخ"]), slug: `l${i}`, name: "n", nameAr: "ن", process: "WASHED", processLabel: null,
      roastLevel: null, averageRating: 4, reviewCount: 1, originCountry: null,
    }));
    const db = { coffeeLot: { findMany: vi.fn().mockResolvedValue(rows) } } as unknown as PrismaClient;
    const query = parseBrowseQuery(new URLSearchParams(""));
    expect(query.sort).toBe("for_you");
    const res = await browseLots(db, query, null);
    expect(res.total).toBe(8);
    expect(res.lots.map((l) => l.slug).sort()).toEqual(rows.map((r) => r.slug).sort());
  });
});
