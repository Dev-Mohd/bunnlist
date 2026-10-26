import { describe, it, expect } from "vitest";
import { scoreMatch } from "../tasteMatch";

const coffee = (rating: number, notes: string[], process = "NATURAL", origin = "ET") => ({ rating, notes, process, origin });

describe("scoreMatch", () => {
  it("waits for enough ratings", () => {
    const r = scoreMatch([coffee(5, ["فراولة"])], { notes: ["توت"], process: "NATURAL", origin: "ET" });
    expect(r).toMatchObject({ score: null, needed: 2 });
  });

  it("scores high for loved flavors and low for disliked ones, with reasons", () => {
    const rated = [
      coffee(5, ["فراولة", "توت"]), coffee(5, ["كرز", "ياسمين"]), coffee(4, ["توت أحمر"]),
      coffee(1, ["شوكولاتة داكنة", "مكسرات"], "WASHED", "BR"), coffee(2, ["كاكاو"], "WASHED", "BR"),
    ];
    const berry = scoreMatch(rated, { notes: ["فراولة", "عنب"], process: "NATURAL", origin: "ET" }, "إثيوبيا");
    const choc = scoreMatch(rated, { notes: ["شوكولاتة", "بندق"], process: "WASHED", origin: "BR" }, "البرازيل");
    expect(berry.score!).toBeGreaterThan(75);
    expect(choc.score!).toBeLessThan(40);
    expect(berry.reasons[0]).toEqual({ positive: true, text: "تحب التوت والفواكه الحمراء" });
    expect(choc.reasons.some((r) => !r.positive && r.text.includes("الشوكولاتة"))).toBe(true);
  });

  it("stays near the middle for something new", () => {
    const rated = [coffee(4, ["فراولة"]), coffee(4, ["توت"]), coffee(4, ["كرز"])];
    const r = scoreMatch(rated, { notes: ["هيل"], process: null, origin: null });
    expect(r.score!).toBeGreaterThanOrEqual(55);
    expect(r.score!).toBeLessThanOrEqual(70);
    expect(r.reasons[0].text).toContain("جديدة");
  });
});
