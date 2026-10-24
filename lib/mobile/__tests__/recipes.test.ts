import { describe, it, expect } from "vitest";
import { validateRecipe, RecipeUpsert, normalizeSteps, mapRecipe } from "../recipes";

const v60 = {
  title: "صباحية",
  methodCode: "V60",
  hotWaterGrams: 250,
  steps: [
    { kind: "bloom" as const, addedWaterGrams: 50 },
    { kind: "pour" as const, addedWaterGrams: 100 },
    { kind: "pour" as const, addedWaterGrams: 100 },
    { kind: "serve" as const },
  ],
};

describe("validateRecipe", () => {
  it("accepts a pour-over whose pours add up to the hot water", () => {
    expect(validateRecipe(v60)).toEqual([]);
  });
  it("allows 1g of rounding between pours and hot water", () => {
    expect(validateRecipe({ ...v60, hotWaterGrams: 251 })).toEqual([]);
    expect(validateRecipe({ ...v60, hotWaterGrams: 252 })).toEqual(["pourSumDoesNotMatchHotWater"]);
  });
  it("requires a title and hot water for non-espresso", () => {
    expect(validateRecipe({ ...v60, title: "  ", hotWaterGrams: null })).toEqual(["missingTitle", "missingHotWater"]);
  });
  it("rejects water on a non-pour step and zero pours", () => {
    const steps = [{ kind: "swirl" as const, addedWaterGrams: 10 }, { kind: "pour" as const, addedWaterGrams: 0 }];
    expect(validateRecipe({ ...v60, steps })).toEqual([
      "waterOnNonPourStep", "negativeOrZeroWater", "pourSumDoesNotMatchHotWater",
    ]);
  });
  it("espresso needs dose and yield but no pour matching", () => {
    expect(validateRecipe({ title: "شوت", methodCode: "ESPRESSO", steps: [] }))
      .toEqual(["missingEspressoDose", "missingEspressoYield"]);
    expect(validateRecipe({ title: "شوت", methodCode: "ESPRESSO", doseGrams: 18, yieldGrams: 36, steps: [] }))
      .toEqual([]);
  });
});

describe("RecipeUpsert", () => {
  it("accepts a minimal draft and fills defaults", () => {
    const r = RecipeUpsert.parse({ clientId: "c1", methodCode: "V60" });
    expect(r.title).toBe("");
    expect(r.temperature).toBe("hot");
    expect(r.steps).toEqual([]);
    expect(r.publish).toBe(false);
  });
  it("rejects bad methods, step kinds, temperatures and too many steps", () => {
    expect(RecipeUpsert.safeParse({ clientId: "c", methodCode: "MOKA" }).success).toBe(false);
    expect(RecipeUpsert.safeParse({ clientId: "c", methodCode: "V60", steps: [{ kind: "stir" }] }).success).toBe(false);
    expect(RecipeUpsert.safeParse({ clientId: "c", methodCode: "V60", waterTempC: 120 }).success).toBe(false);
    const many = Array.from({ length: 21 }, () => ({ kind: "pour", addedWaterGrams: 10 }));
    expect(RecipeUpsert.safeParse({ clientId: "c", methodCode: "V60", steps: many }).success).toBe(false);
  });
});

describe("normalizeSteps", () => {
  it("drops malformed stored steps and fills nulls", () => {
    expect(normalizeSteps([{ kind: "pour", addedWaterGrams: 50 }, { kind: "nope" }, "x"])).toEqual([
      { kind: "pour", addedWaterGrams: 50, seconds: null, note: "" },
    ]);
    expect(normalizeSteps(null)).toEqual([]);
  });
});

describe("mapRecipe", () => {
  it("marks ownership and never exposes the account id", () => {
    const row = {
      id: "r1", accountId: "a1", clientId: "c1", lotId: null, title: "t", methodCode: "V60", temperature: "iced",
      doseGrams: 15, hotWaterGrams: 150, iceGrams: 100, yieldGrams: null, waterTempC: 94, grinder: "", grindSetting: "",
      notes: "", steps: [], sourceId: null, sourceVersion: null, version: 2, state: "published",
      publishedAt: new Date("2026-10-24T00:00:00Z"), updatedAt: new Date("2026-10-24T01:00:00Z"),
    };
    const mine = mapRecipe(row, "a1", null, "محمد");
    expect(mine.isMine).toBe(true);
    expect(mine.temperature).toBe("iced");
    expect(mine).not.toHaveProperty("accountId");
    expect(mapRecipe(row, "a2", null, "محمد").isMine).toBe(false);
    expect(mapRecipe(row, null, null, "محمد").isMine).toBe(false);
  });
});
