import { describe, it, expect } from "vitest";
import { tasteProfile, TASTE_UNLOCK, type RatedCoffee } from "../summary";

const r = (rating: number, originNameAr: string, process: string, method: string, flavorNotes: string[]): RatedCoffee =>
  ({ rating, originNameAr, process, method, flavorNotes });

describe("tasteProfile", () => {
  it("stays locked until enough ratings, showing progress", () => {
    const t = tasteProfile([r(5, "إثيوبيا", "NATURAL", "V60", [])]);
    expect(t.unlocked).toBe(false);
    expect(t.progress).toBe(1);
    expect(t.required).toBe(TASTE_UNLOCK);
    expect(t.topOrigins).toEqual([]);
  });

  it("finds the best-rated origins and processes, liked flavors and favorite method", () => {
    const t = tasteProfile([
      r(5, "إثيوبيا", "NATURAL", "V60", ["توت", "ياسمين"]),
      r(5, "إثيوبيا", "WASHED", "V60", ["ياسمين", "ليمون"]),
      r(4, "كولومبيا", "WASHED", "ESPRESSO", ["شوكولاتة", "ياسمين"]),
      r(2, "البرازيل", "NATURAL", "ESPRESSO", ["مكسرات"]),
      r(3, "كولومبيا", "HONEY", "CHEMEX", ["كراميل"]),
    ]);
    expect(t.unlocked).toBe(true);
    expect(t.averageRating).toBe(3.8);
    expect(t.topOrigins[0]).toEqual({ name: "إثيوبيا", count: 2, average: 5 });
    expect(t.topOrigins.map((g) => g.name)).toEqual(["إثيوبيا", "كولومبيا", "البرازيل"]);
    expect(t.topProcesses[0].name).toBe("WASHED");
    expect(t.topFlavors[0]).toBe("ياسمين");
    expect(t.topFlavors).not.toContain("مكسرات"); // only from coffees rated 4+
    expect(t.favoriteMethod).toBe("V60");
  });
});

import { tasteHeadline } from "../summary";

describe("the taste card's ring and summary", () => {
  const rated: RatedCoffee[] = [
    { rating: 5, originNameAr: "إثيوبيا", originCode: "ET", process: "NATURAL", method: "V60", flavorNotes: ["توت أحمر", "ياسمين"] },
    { rating: 5, originNameAr: "إثيوبيا", originCode: "ET", process: "WASHED", method: "V60", flavorNotes: ["فراولة", "توت"] },
    { rating: 4, originNameAr: "كولومبيا", originCode: "CO", process: "WASHED", method: "V60", flavorNotes: ["شوكولاتة", "ياسمين"] },
    { rating: 2, originNameAr: "البرازيل", originCode: "BR", process: "NATURAL", method: "ESPRESSO", flavorNotes: ["مكسرات"] },
    { rating: 4, originNameAr: "كولومبيا", originCode: "CO", process: "HONEY", method: "CHEMEX", flavorNotes: ["شي غريب"] },
  ];
  it("shares the liked families, once per coffee, and skips unknown notes", () => {
    const t = tasteProfile(rated);
    expect(t.ratedCount).toBe(5);
    expect(t.families.map((f) => f.code)).toEqual(["berry", "floral", "chocolate"]);
    expect(t.families.map((f) => f.share)).toEqual([0.4, 0.4, 0.2]);
    expect(t.families.reduce((a, f) => a + f.share, 0)).toBeCloseTo(1);
    expect(t.families.some((f) => f.code === "nutty")).toBe(false); // the disliked coffee doesn't count
  });
  it("tags each top flavour with its family and each origin with its code", () => {
    const t = tasteProfile(rated);
    expect(t.flavors.find((f) => f.name === "ياسمين")).toEqual({ name: "ياسمين", family: "floral" });
    expect(t.flavors.find((f) => f.name === "شي غريب")?.family).toBe("other");
    expect(t.topOrigins[0]).toMatchObject({ name: "إثيوبيا", code: "ET" });
  });
  it("sums it up in one sentence", () => {
    expect(tasteProfile(rated).headline).toBe("تحب نكهات التوت والزهور، وأقرب منشأ لذوقك إثيوبيا.");
    expect(tasteHeadline([], "اليمن")).toBe("أقرب منشأ لذوقك اليمن.");
    expect(tasteHeadline([{ code: "honey", nameAr: "العسل", share: 1 }], null)).toBe("تحب نكهات العسل.");
    expect(tasteHeadline([], null)).toBeNull();
    expect(tasteProfile(rated.slice(0, 2)).headline).toBeNull(); // still locked
  });
});

