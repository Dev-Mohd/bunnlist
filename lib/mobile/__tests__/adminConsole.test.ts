import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { LotEdit, overview, replaceLotPhoto, updateLot } from "../adminConsole";
import { fileReport, resolveReport } from "../reports";

const lotDetail = {
  id: "L1", slug: "bk-nardos", nameAr: "ناردوس", name: "Nardos", imageUrl: null, publishedAt: new Date(), reviewCount: 0,
  roaster: { nameAr: "بلاك نايت" }, originCountry: { isoCode: "ET", nameAr: "إثيوبيا" }, process: "ANAEROBIC",
  processLabel: null, roastLevel: null, flavorNotes: [], region: null, regionAr: null, variety: null, altitudeMeters: null, descriptionAr: null,
};

function lotPrisma() {
  return {
    coffeeLot: {
      findUnique: vi.fn().mockImplementation(async ({ select }: { select: Record<string, unknown> }) =>
        (select.flavorNotes ? lotDetail : { id: "L1", slug: "bk-nardos", publishedAt: lotDetail.publishedAt })),
      update: vi.fn().mockResolvedValue({}),
    },
    originCountry: { findUnique: vi.fn().mockResolvedValue({ id: "O-YE" }), create: vi.fn() },
    mobileLotTag: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn(), createMany: vi.fn() },
    mobileTrendingOverride: { findUnique: vi.fn().mockResolvedValue(null) },
  };
}

describe("admin console: lots", () => {
  it("changes only the fields sent, hides, and syncs tags", async () => {
    const m = lotPrisma();
    const edit = LotEdit.parse({ flavorNotes: ["خوخ"], originCode: "ye", originNameAr: "اليمن", published: false, tags: ["luxury"], region: "" });
    await updateLot(m as unknown as PrismaClient, "L1", edit);
    const data = m.coffeeLot.update.mock.calls[0][0].data;
    expect(data).toEqual({ flavorNotes: ["خوخ"], originCountryId: "O-YE", publishedAt: null, regionAr: null });
    expect(m.mobileLotTag.deleteMany).toHaveBeenCalledWith({ where: { lotId: "L1", tag: { notIn: ["luxury"] } } });
  });

  it("replaces the photo under a content-hashed name", async () => {
    const m = lotPrisma();
    const store = { put: vi.fn(), signedUrl: vi.fn(), publish: vi.fn(), putPublic: vi.fn().mockImplementation(async (d: string) => `https://cdn/${d}`) };
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(200)]).toString("base64");
    const { imageUrl } = await replaceLotPhoto(m as unknown as PrismaClient, store, "L1", jpeg);
    expect(imageUrl).toMatch(/^https:\/\/cdn\/lots\/bk-nardos-[0-9a-f]{8}\.jpg$/);
    expect(m.coffeeLot.update.mock.calls[0][0].data).toMatchObject({ imageUrl, imageType: "USER_UPLOADED" });
  });
});

describe("admin console: overview", () => {
  it("fills 30 days, oldest first", async () => {
    const count = vi.fn().mockResolvedValue(2);
    const m = {
      mobileProfile: { count, findMany: vi.fn().mockResolvedValue([{ createdAt: new Date("2026-11-02T09:00:00Z") }]) },
      mobilePointEvent: { count, groupBy: vi.fn().mockResolvedValue([{ day: "2026-11-02", _count: { _all: 5 } }]) },
      review: { count }, mobileRecipe: { count }, mobileBrewExperience: { count }, mobileAiScan: { count },
      coffeeLot: { count }, mobileCoffeeSubmission: { count }, mobileReport: { count },
    };
    const o = await overview(m as unknown as PrismaClient, new Date("2026-11-02T12:00:00Z"));
    expect(o.series).toHaveLength(30);
    expect(o.series[29]).toEqual({ day: "2026-11-02", active: 5, newUsers: 1 });
    expect(o.series[0].day).toBe("2026-10-04");
  });
});

describe("reports", () => {
  const review = { userId: "owner", rating: 1, body: "سيء", coffeeLot: { nameAr: "ناردوس" } };

  it("refuses reporting your own content and files one open report per person", async () => {
    const m = {
      review: { findUnique: vi.fn().mockResolvedValue(review) },
      mobileReport: { findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValue({ id: "r1" }), create: vi.fn() },
    };
    const p = m as unknown as PrismaClient;
    await expect(fileReport(p, "owner", { targetType: "review", targetId: "R1", reason: "spam" })).rejects.toThrow();
    await fileReport(p, "me", { targetType: "review", targetId: "R1", reason: "spam" });
    await fileReport(p, "me", { targetType: "review", targetId: "R1", reason: "spam" });
    expect(m.mobileReport.create).toHaveBeenCalledTimes(1);
  });

  it("removing hides the review, refreshes the lot's stats and closes all its reports", async () => {
    const tx = {
      review: { update: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      coffeeLot: { update: vi.fn() },
      coffeeLotBrewStat: { deleteMany: vi.fn(), upsert: vi.fn() },
    };
    const m = {
      mobileReport: {
        findUnique: vi.fn().mockResolvedValue({ id: "r1", targetType: "review", targetId: "R1" }),
        updateMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
      review: { findUnique: vi.fn().mockResolvedValue({ coffeeLotId: "L1" }) },
      $transaction: vi.fn().mockImplementation(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    };
    const result = await resolveReport(m as unknown as PrismaClient, "admin", "r1", "remove");
    expect(tx.review.update).toHaveBeenCalledWith({ where: { id: "R1" }, data: { status: "HIDDEN" } });
    expect(tx.coffeeLot.update).toHaveBeenCalledWith({ where: { id: "L1" }, data: { averageRating: 0, reviewCount: 0 } });
    expect(m.mobileReport.updateMany.mock.calls[0][0]).toMatchObject({ where: { targetType: "review", targetId: "R1", status: "open" }, data: { status: "removed" } });
    expect(result.closed).toBe(3);
  });
});
