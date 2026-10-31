import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { queueItems, queueRoasters, suggestDetails, tidySuggestion } from "../adminQueue";

const sub = (over: Record<string, unknown> = {}) => ({
  id: "s1", name: "شيلشلي", nameEn: null, roasterName: "محمصة دبليو", originName: "إثيوبيا", process: "NATURAL", roastLevel: null,
  flavorNotes: ["توت"], photoPath: "imports/x.jpg", sourceUrl: null, extras: { descriptionAr: "مجففة بإيحاءات التوت" }, note: null, ...over,
});

function fake() {
  const m = {
    mobileCoffeeSubmission: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
    coffeeLot: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
  };
  return { prisma: m as unknown as PrismaClient, m };
}

describe("queueRoasters", () => {
  it("groups waiting suggestions by roaster with what each is missing, biggest first", async () => {
    const { prisma, m } = fake();
    m.mobileCoffeeSubmission.findMany.mockResolvedValue([
      sub(), sub({ roasterName: "أودن", originName: null, process: null, flavorNotes: [] }),
      sub({ roasterName: "أودن", photoPath: null }),
    ]);
    const groups = await queueRoasters(prisma, "pending");
    expect(groups.map((g) => g.roaster)).toEqual(["أودن", "محمصة دبليو"]);
    expect(groups[0]).toMatchObject({ count: 2, noOrigin: 1, noProcess: 1, noNotes: 1, noPhoto: 1 });
    expect(groups[0].imageUrl).toBeNull();

    const store = { put: vi.fn(), publish: vi.fn(), signedUrl: vi.fn(async (p: string) => `https://signed/${p}`) };
    const withPhotos = await queueRoasters(prisma, "pending", store);
    expect(withPhotos.map((g) => g.imageUrl)).toEqual([`https://signed/${sub().photoPath}`, `https://signed/${sub().photoPath}`]);
    expect(store.signedUrl).toHaveBeenCalledTimes(2);
  });

  it("counts a blend origin and an OTHER process as missing on published coffees", async () => {
    const { prisma, m } = fake();
    m.coffeeLot.findMany.mockResolvedValue([{
      id: "l1", nameAr: "مزيج", name: "Blend", imageUrl: "https://x/a.jpg", process: "OTHER", roastLevel: null, flavorNotes: [],
      descriptionAr: null, roaster: { nameAr: "سويل" }, originCountry: { isoCode: "XB", nameAr: "مزيج" },
    }]);
    const [g] = await queueRoasters(prisma, "incomplete");
    expect(g).toMatchObject({ roaster: "سويل", count: 1, noOrigin: 1, noProcess: 1, noNotes: 1, noPhoto: 0, imageUrl: "https://x/a.jpg" });
  });
});

describe("queueItems", () => {
  it("serves one roaster's suggestions as cards with signed photos", async () => {
    const { prisma, m } = fake();
    m.mobileCoffeeSubmission.findMany.mockResolvedValue([sub({ flavorNotes: [] })]);
    const store = { put: vi.fn(), publish: vi.fn(), signedUrl: vi.fn().mockResolvedValue("https://signed") };
    const [card] = await queueItems(prisma, store, "pending", "محمصة دبليو");
    expect(m.mobileCoffeeSubmission.findMany.mock.calls[0][0].where).toEqual({ status: "PENDING", roasterName: "محمصة دبليو" });
    expect(card).toMatchObject({ kind: "submission", imageUrl: "https://signed", missing: ["notes"], descriptionAr: "مجففة بإيحاءات التوت" });
  });
});

describe("suggestions", () => {
  it("keeps only valid, short answers", () => {
    expect(tidySuggestion({
      process: "NATURAL", originCode: "et", originNameAr: " إثيوبيا ", roastLevel: null,
      flavorNotes: ["توت", "توت", " فراولة ", "x", "قوام ممتلئ وحموضة متوسطة وحلاوة عالية جدا جدا"],
    })).toEqual({ process: "NATURAL", originCode: "ET", originNameAr: "إثيوبيا", flavorNotes: ["توت", "فراولة"], roastLevel: null });
    expect(tidySuggestion({ process: null, originCode: "XB", originNameAr: "مزيج", flavorNotes: [], roastLevel: null }).originCode).toBeNull();
  });

  it("reads the description, and says nothing when there's none", async () => {
    const { prisma, m } = fake();
    const reader = { read: vi.fn().mockResolvedValue({ process: "WASHED", originCode: "CO", originNameAr: "كولومبيا", flavorNotes: ["كراميل"], roastLevel: null }) };
    m.mobileCoffeeSubmission.findUnique.mockResolvedValue(sub());
    expect(await suggestDetails(prisma, reader, "submission", "s1")).toMatchObject({ process: "WASHED", originCode: "CO" });
    expect(reader.read.mock.calls[0][0]).toContain("مجففة بإيحاءات التوت");
    m.coffeeLot.findUnique.mockResolvedValue({ nameAr: "مزيج", descriptionAr: null });
    expect(await suggestDetails(prisma, reader, "lot", "l1")).toEqual({ process: null, originCode: null, originNameAr: null, flavorNotes: [], roastLevel: null });
    expect(reader.read).toHaveBeenCalledOnce();
  });

  it("reads the photos on a published coffee's store page, even with no description", async () => {
    const { prisma, m } = fake();
    const reader = { read: vi.fn().mockResolvedValue({ process: "NATURAL", originCode: "ET", originNameAr: "إثيوبيا", flavorNotes: ["ياسمين"], roastLevel: null }) };
    m.coffeeLot.findUnique.mockResolvedValue({ nameAr: "اوراقا", descriptionAr: null });
    m.mobileCoffeeSubmission.findFirst.mockResolvedValue({ sourceUrl: "https://kuf.sa/ar/x/p1" });
    const card = Buffer.from("jpeg");
    const images = vi.fn().mockResolvedValue([card]);
    expect(await suggestDetails(prisma, reader, "lot", "l1", images)).toMatchObject({ process: "NATURAL", flavorNotes: ["ياسمين"] });
    expect(images).toHaveBeenCalledWith("https://kuf.sa/ar/x/p1");
    expect(reader.read.mock.calls[0][1]).toEqual([card]);
  });
});
