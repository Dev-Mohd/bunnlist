import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  BagScanRequest, normalizeExtraction, matchQueries, rankMatches, scanBag, DAILY_SCAN_LIMIT,
  type BagExtraction, type BagReader,
} from "../bagScan";
import type { MobileLot } from "../catalog";

const base: BagExtraction = {
  isCoffeeBag: true, name: "  Yirgacheffe Konga ", nameAr: null, roaster: "Camel Step", roasterAr: "كامل ستيب", originCountry: "Ethiopia",
  originCountryAr: "إثيوبيا", originCountryCode: "et", region: "Yirgacheffe", farm: null, producer: null,
  varieties: ["Heirloom", "Heirloom ", ""], process: "WASHED", processLabel: "Washed", roastLevel: "light",
  roastDate: "2026-10-01", altitudeMeters: 2100.4, flavorNotesAr: ["ياسمين", "ليمون", "ياسمين"], weightGrams: 250,
  recommendedBrewMethods: ["V60", "V60"], confidence: "high",
};

const lot = (id: string): MobileLot => ({ id, slug: id } as unknown as MobileLot);

describe("normalizeExtraction", () => {
  it("trims, de-duplicates and upper-cases the country code", () => {
    const n = normalizeExtraction(base);
    expect(n.name).toBe("Yirgacheffe Konga");
    expect(n.originCountryCode).toBe("ET");
    expect(n.varieties).toEqual(["Heirloom"]);
    expect(n.flavorNotesAr).toEqual(["ياسمين", "ليمون"]);
    expect(n.recommendedBrewMethods).toEqual(["V60"]);
    expect(n.altitudeMeters).toBe(2100);
  });
  it("drops implausible numbers, bad dates and codes", () => {
    const n = normalizeExtraction({
      ...base, altitudeMeters: 12000, weightGrams: -1, roastDate: "1/10", originCountryCode: "Ethiopia", name: "  ",
    });
    expect(n.altitudeMeters).toBeNull();
    expect(n.weightGrams).toBeNull();
    expect(n.roastDate).toBeNull();
    expect(n.originCountryCode).toBeNull();
    expect(n.name).toBeNull();
  });
});

describe("matching", () => {
  it("queries names before the roaster and skips blanks", () => {
    expect(matchQueries({ ...base, nameAr: "كونغا", name: "Konga" })).toEqual(["كونغا", "Konga", "كامل ستيب", "Camel Step"]);
    expect(matchQueries({ ...base, name: null, roaster: "x", roasterAr: null })).toEqual([]);
  });
  it("ranks lots found by more terms first, then by term order", () => {
    const ranked = rankMatches([[lot("a"), lot("b")], [lot("b")], [lot("c"), lot("a")]]);
    expect(ranked.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });
});

describe("BagScanRequest", () => {
  it("accepts a JPEG payload and rejects tiny or unsupported ones", () => {
    expect(BagScanRequest.safeParse({ imageBase64: "x".repeat(200) }).success).toBe(true);
    expect(BagScanRequest.safeParse({ imageBase64: "x" }).success).toBe(false);
    expect(BagScanRequest.safeParse({ imageBase64: "x".repeat(200), mediaType: "image/heic" }).success).toBe(false);
  });
});

describe("scanBag", () => {
  const image = { imageBase64: "x".repeat(200), mediaType: "image/jpeg" as const };

  function fakePrisma(used: number) {
    return {
      mobileAiScan: { count: vi.fn().mockResolvedValue(used), create: vi.fn().mockResolvedValue({}) },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient & { mobileAiScan: { create: ReturnType<typeof vi.fn> } };
  }

  it("refuses past the daily limit without calling the model", async () => {
    const reader: BagReader = { read: vi.fn() };
    await expect(scanBag(fakePrisma(DAILY_SCAN_LIMIT), reader, "acc", image)).rejects.toMatchObject({ code: "rateLimited" });
    expect(reader.read).not.toHaveBeenCalled();
  });

  it("logs the scan and reports what is left today", async () => {
    const prisma = fakePrisma(3);
    const reader: BagReader = { read: vi.fn().mockResolvedValue({ ...base, isCoffeeBag: false }) };
    const result = await scanBag(prisma, reader, "acc", image);
    expect(result.matches).toEqual([]);
    expect(result.remainingToday).toBe(DAILY_SCAN_LIMIT - 4);
    expect(prisma.mobileAiScan.create).toHaveBeenCalledOnce();
  });
});
