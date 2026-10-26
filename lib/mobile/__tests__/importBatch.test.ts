import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { BUNDLED_BATCHES, importBatch } from "../importBatch";
import { tagsFrom } from "../admin";

const item = (key: string, name: string, roaster = "محمصة الرياض") => ({
  importKey: key, name, nameEn: name, roasterName: roaster, roasterNameEn: "Arriyadh Roaster",
  originName: "إثيوبيا", process: "NATURAL", roastLevel: "light", flavorNotes: ["خوخ"],
  sourceUrl: "https://example.com/p", sourceConfidence: 0.9, extras: { isLuxury: true },
});

describe("importBatch", () => {
  it("adds new items as catalog suggestions, skipping imported and catalogued ones", async () => {
    const m = {
      mobileCoffeeSubmission: {
        findMany: vi.fn().mockResolvedValue([{ id: "s1", importKey: "k1", status: "APPROVED", photoPath: null }]),
        create: vi.fn().mockResolvedValue({}),
      },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([{ name: "x", nameAr: "جبل السودة", roaster: { name: "r", nameAr: "محمصة الرياض" } }]) },
    };
    const result = await importBatch(m as unknown as PrismaClient, {
      batch: "t", items: [item("k1", "قديمة"), item("k2", "جبل السودة"), item("k3", "جديدة")],
    });
    expect(result).toEqual({ created: 1, alreadyImported: 1, alreadyInCatalog: 1, photos: 0 });
    expect(m.mobileCoffeeSubmission.create.mock.calls[0][0].data).toMatchObject({ accountId: "catalog", importKey: "k3", extras: { isLuxury: true } });
  });

  it("ships a valid bundled batch", async () => {
    const m = {
      mobileCoffeeSubmission: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}) },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const store = { put: vi.fn().mockResolvedValue(undefined), signedUrl: vi.fn(), publish: vi.fn() };
    const bundle = BUNDLED_BATCHES["roasteries-2026-05"];
    const result = await importBatch(m as unknown as PrismaClient, bundle.data, bundle.photos, store);
    expect(result.created).toBe(117);
    expect(result.photos).toBe(24);
    expect(store.put).toHaveBeenCalledWith("imports/bk-milora.jpg", expect.any(Buffer));
  });

  it("turns extras into lot tags", () => {
    expect(tagsFrom({ isLuxury: true, isDecaf: true })).toEqual(["luxury", "decaf"]);
    expect(tagsFrom({})).toEqual([]);
  });
});
