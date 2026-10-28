import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { approvalFor, bulkReview, deleteLot } from "../adminBulk";

const row = (over: Record<string, unknown> = {}) => ({
  id: "s1", status: "PENDING", name: "كولومبيا ويلا", nameEn: "Colombia Huila", roasterName: "بونيستا", roasterNameEn: "Bunista",
  originName: "كولومبيا", process: "WASHED", roastLevel: null, flavorNotes: ["شوكولاتة"], photoPath: null, extras: {}, accountId: "catalog", ...over,
});

function db(rows: ReturnType<typeof row>[], origins: Record<string, string> = { "كولومبيا": "CO" }) {
  const m = {
    originCountry: {
      findFirst: vi.fn().mockImplementation(({ where }: { where: { nameAr: string } }) =>
        origins[where.nameAr] ? { isoCode: origins[where.nameAr], nameAr: where.nameAr } : null),
      findUnique: vi.fn().mockResolvedValue({ id: "o1" }), create: vi.fn(),
    },
    mobileCoffeeSubmission: {
      findMany: vi.fn().mockResolvedValue(rows),
      findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id)),
      update: vi.fn().mockResolvedValue({}), updateMany: vi.fn(),
    },
    roaster: { findFirst: vi.fn().mockResolvedValue({ id: "r1", name: "Bunista" }), findUnique: vi.fn(), create: vi.fn() },
    coffeeLot: {
      findUnique: vi.fn().mockResolvedValue(null), delete: vi.fn(),
      create: vi.fn().mockImplementation(({ data }: { data: { slug: string } }) => ({ id: "lot1", slug: data.slug })),
    },
    mobileLotTag: { createMany: vi.fn(), deleteMany: vi.fn() },
    review: { count: vi.fn().mockResolvedValue(0) },
    mobileBrewExperience: { count: vi.fn().mockResolvedValue(0) },
    mobileRecipe: { count: vi.fn().mockResolvedValue(0) },
    mobileCollectionEntry: { deleteMany: vi.fn() },
    mobileTrendingOverride: { deleteMany: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return { prisma: m as unknown as PrismaClient, m };
}

describe("approvalFor", () => {
  it("fills the form from the suggestion and files blends under مزيج", async () => {
    const { prisma } = db([]);
    const a = await approvalFor(prisma, row());
    expect(a).toMatchObject({ nameAr: "كولومبيا ويلا", name: "Colombia Huila", originCode: "CO", process: "WASHED" });
    const blend = await approvalFor(prisma, row({ originName: null, process: null }));
    expect(blend).toMatchObject({ originCode: "XB", originNameAr: "مزيج", process: "OTHER" });
  });

  it("refuses an origin it can't place", async () => {
    const { prisma } = db([]);
    await expect(approvalFor(prisma, row({ originName: "أطلانتس" }))).rejects.toMatchObject({ reason: "unknown_origin" });
  });
});

describe("bulkReview", () => {
  it("approves each one and reports the ones it couldn't", async () => {
    const { prisma, m } = db([row(), row({ id: "s2", name: "غريبة", originName: "أطلانتس" })]);
    const r = await bulkReview(prisma, null, { ids: ["s1", "s2", "s3"], action: "approve" });
    expect(r.done).toEqual(["s1"]);
    expect(r.failed.map((f) => f.id)).toEqual(["s2", "s3"]);
    expect(r.failed[0].reason).toContain("بلد المنشأ");
    expect(m.coffeeLot.create).toHaveBeenCalledOnce();
  });

  it("rejects them all", async () => {
    const { prisma, m } = db([row(), row({ id: "s2" })]);
    const r = await bulkReview(prisma, null, { ids: ["s1", "s2"], action: "reject" });
    expect(r.done).toEqual(["s1", "s2"]);
    expect(m.mobileCoffeeSubmission.update).toHaveBeenCalledTimes(2);
  });
});

describe("deleteLot", () => {
  it("removes an unused lot and marks its suggestion so re-imports skip it", async () => {
    const { prisma, m } = db([]);
    m.coffeeLot.findUnique.mockResolvedValue({ id: "lot1" });
    await expect(deleteLot(prisma, "lot1")).resolves.toEqual({ deleted: true });
    expect(m.mobileCoffeeSubmission.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { approvedLotId: "lot1" }, data: expect.objectContaining({ status: "REJECTED", approvedLotId: null }),
    }));
    expect(m.coffeeLot.delete).toHaveBeenCalledWith({ where: { id: "lot1" } });
  });

  it("won't delete a lot people have brewed or reviewed", async () => {
    const { prisma, m } = db([]);
    m.coffeeLot.findUnique.mockResolvedValue({ id: "lot1" });
    m.review.count.mockResolvedValue(1);
    await expect(deleteLot(prisma, "lot1")).rejects.toMatchObject({ reason: "lot_in_use" });
    expect(m.$transaction).not.toHaveBeenCalled();
  });
});
