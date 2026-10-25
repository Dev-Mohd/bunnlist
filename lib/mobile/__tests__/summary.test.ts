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
