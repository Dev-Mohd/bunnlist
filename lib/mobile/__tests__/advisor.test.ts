import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { advise, AdvisorRequest, pickTop, reasonLine, scoreCandidate, toPercent, type TextReader } from "../advisor";

const base = {
  id: "x", flavorNotes: [] as string[], process: "WASHED", roastLevel: null, averageRating: 4, reviewCount: 2,
  recommendedBrewMethods: ["V60"], originCode: "ET", roaster: "r", icedRecipe: false, tried: false,
};
const ask = (over: Partial<AdvisorRequest> = {}): AdvisorRequest =>
  AdvisorRequest.parse({ mood: "calm", method: "V60", serve: "HOT", adventure: 0.3, families: [], ...over });

describe("scoreCandidate", () => {
  it("rewards picked flavours and says why", () => {
    const berry = scoreCandidate({ ...base, flavorNotes: ["توت", "ياسمين"] }, ask({ families: ["berry", "floral"] }), null);
    const choc = scoreCandidate({ ...base, flavorNotes: ["شوكولاتة"] }, ask({ families: ["berry", "floral"] }), null);
    expect(berry.score).toBeGreaterThan(choc.score);
    expect(berry.why[0]).toContain("التوت");
  });

  it("espresso with milk leans to chocolate and caramel", () => {
    const a = ask({ method: "ESPRESSO", milk: true });
    const choc = scoreCandidate({ ...base, recommendedBrewMethods: ["ESPRESSO"], flavorNotes: ["شوكولاتة", "كراميل"] }, a, null);
    const lemon = scoreCandidate({ ...base, recommendedBrewMethods: ["ESPRESSO"], flavorNotes: ["ليمون"] }, a, null);
    expect(choc.score).toBeGreaterThan(lemon.score);
    expect(choc.why).toContain("تطلع حلوة مع الحليب");
  });

  it("iced prefers coffees with an iced roaster recipe", () => {
    const a = ask({ serve: "ICED" });
    expect(scoreCandidate({ ...base, icedRecipe: true }, a, null).score).toBeGreaterThan(scoreCandidate(base, a, null).score);
  });

  it("adventure lifts bold processes, safety lifts proven ones", () => {
    const bold = { ...base, process: "ANAEROBIC", reviewCount: 0, averageRating: 0 };
    const proven = { ...base, reviewCount: 12, averageRating: 4.8 };
    expect(scoreCandidate(bold, ask({ adventure: 1 }), null).score).toBeGreaterThan(scoreCandidate(proven, ask({ adventure: 1 }), null).score);
    expect(scoreCandidate(proven, ask({ adventure: 0 }), null).score).toBeGreaterThan(scoreCandidate(bold, ask({ adventure: 0 }), null).score);
  });

  it("uses what was read from their sentence", () => {
    const u = { families: ["berry" as const], avoidFamilies: ["chocolate" as const], acidity: "any" as const, body: "any" as const, chips: [] };
    const berry = scoreCandidate({ ...base, flavorNotes: ["توت"] }, ask(), u);
    const choc = scoreCandidate({ ...base, flavorNotes: ["كاكاو"] }, ask(), u);
    expect(berry.score - choc.score).toBeGreaterThan(3);
  });
});

describe("helpers", () => {
  it("picks one per roaster", () => {
    const top = pickTop([{ id: "a", roaster: "r1", score: 9 }, { id: "b", roaster: "r1", score: 8 }, { id: "c", roaster: "r2", score: 5 }]);
    expect(top.map((t) => t.id)).toEqual(["a", "c"]);
  });
  it("maps to friendly percents", () => {
    expect(toPercent(10, 10)).toBe(98);
    expect(toPercent(0, 10)).toBe(70);
    expect(toPercent(5, 0)).toBe(75);
  });
  it("writes a reason", () => {
    expect(reasonLine(["توت", "ياسمين", "خوخ"], ["تنفع V60"])).toBe("توت وياسمين · تنفع V60");
    expect(reasonLine([], [])).toBe("قريبة من اللي اخترته");
  });
});

function db(over: Record<string, unknown> = {}) {
  const lot = (id: string, notes: string[], roaster: string) => ({
    id, slug: id, name: id, nameAr: id, process: "WASHED", processLabel: null, flavorNotes: notes, roastLevel: null,
    averageRating: 4.5, reviewCount: 3, imageUrl: "x", recommendedBrewMethods: ["V60"],
    roaster: { nameAr: roaster, name: roaster, slug: roaster }, originCountry: { nameAr: "إثيوبيا", isoCode: "ET" },
  });
  const m = {
    coffeeLot: { findMany: vi.fn().mockResolvedValue([lot("a", ["توت"], "r1"), lot("b", ["توت"], "r1"), lot("c", ["شوكولاتة"], "r2"), lot("d", ["ياسمين"], "r3")]) },
    mobileRoasterRecipe: { findMany: vi.fn().mockResolvedValue([]) },
    mobileCollectionEntry: { findMany: vi.fn().mockResolvedValue([]) },
    review: { findMany: vi.fn().mockResolvedValue([]) },
    mobileAdvisorRun: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({}) },
    ...over,
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("advise", () => {
  it("returns three picks from different roasters, best first", async () => {
    const { db: d, m } = db();
    const res = await advise(d, "acc", ask({ families: ["berry"] }), null);
    expect(res.picks).toHaveLength(3);
    expect(new Set(res.picks.map((p) => p.lot.roasterNameAr)).size).toBe(3);
    expect(res.picks[0].lot.flavorNotes).toEqual(["توت"]);
    expect(res.picks[0].tag).toBe("الأنسب لك");
    expect(res.understood).toBeNull();
    expect(m.mobileAdvisorRun.create).toHaveBeenCalled();
  });

  it("reads the sentence with Claude when signed in, under the daily cap", async () => {
    const reader: TextReader = { read: vi.fn().mockResolvedValue({ families: ["floral"], avoidFamilies: [], acidity: "low", body: "light", chips: ["زهري", "بدون حموضة"] }) };
    const { db: d, m } = db();
    const res = await advise(d, "acc", ask({ text: "أبي شي زهري خفيف" }), reader);
    expect(res.understood?.chips).toEqual(["زهري", "بدون حموضة"]);
    expect(res.picks[0].lot.slug).toBe("d");
    expect(m.mobileAdvisorRun.create.mock.calls[0][0].data.usedAi).toBe(true);
    m.mobileAdvisorRun.count.mockResolvedValue(20);
    await expect(advise(d, "acc", ask({ text: "زهري" }), reader)).rejects.toMatchObject({ code: "rateLimited" });
    await expect(advise(d, null, ask({ text: "زهري" }), reader)).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("still answers when Claude fails", async () => {
    const reader: TextReader = { read: vi.fn().mockRejectedValue(new Error("down")) };
    const { db: d } = db();
    const res = await advise(d, "acc", ask({ text: "أي شي" }), reader);
    expect(res.understood).toBeNull();
    expect(res.picks.length).toBeGreaterThan(0);
  });
});
