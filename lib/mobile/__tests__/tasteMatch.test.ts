import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { scoreMatch, tasteMatchScores } from "../tasteMatch";

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

describe("tasteMatchScores", () => {
  const review = (lotId: string, rating: number, notes: string[]) => ({
    rating, coffeeLotId: lotId, coffeeLot: { flavorNotes: notes, process: "NATURAL", originCountry: { isoCode: "ET" } },
  });

  it("scores unrated coffees once there are enough ratings", async () => {
    const m = {
      review: { findMany: vi.fn().mockResolvedValue([review("a", 5, ["توت"]), review("b", 5, ["فراولة"]), review("c", 2, ["شوكولاتة"])]) },
      coffeeLot: {
        findMany: vi.fn().mockResolvedValue([
          { id: "a", slug: "rated", flavorNotes: ["توت"], process: "NATURAL", originCountry: { isoCode: "ET" } },
          { id: "x", slug: "berry", flavorNotes: ["توت أزرق"], process: "NATURAL", originCountry: { isoCode: "ET" } },
          { id: "y", slug: "choc", flavorNotes: ["شوكولاتة داكنة"], process: "WASHED", originCountry: { isoCode: "BR" } },
        ]),
      },
    };
    const { scores, needed } = await tasteMatchScores(m as unknown as PrismaClient, "me", ["rated", "berry", "choc"]);
    expect(needed).toBe(0);
    expect(scores.rated).toBeUndefined();
    expect(scores.berry).toBeGreaterThan(scores.choc);
  });

  it("says how many ratings are still needed", async () => {
    const m = { review: { findMany: vi.fn().mockResolvedValue([review("a", 5, ["توت"])]) }, coffeeLot: { findMany: vi.fn() } };
    expect(await tasteMatchScores(m as unknown as PrismaClient, "me", ["x"])).toEqual({ scores: {}, needed: 2 });
    expect(m.coffeeLot.findMany).not.toHaveBeenCalled();
  });
});
