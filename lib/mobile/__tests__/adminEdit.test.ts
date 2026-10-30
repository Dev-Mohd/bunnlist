import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { BulkEditRequest, bulkEdit, renameRoasterEn } from "../adminEdit";

describe("bulkEdit", () => {
  it("sets the same details on many waiting suggestions and remembers they were set by hand", async () => {
    const update = vi.fn((x) => x);
    const prisma = {
      mobileCoffeeSubmission: {
        findMany: vi.fn().mockResolvedValue([
          { id: "a", flavorNotes: ["توت"], extras: { adminEdited: ["process"] } },
          { id: "b", flavorNotes: [], extras: null },
        ]),
        update,
      },
      $transaction: vi.fn(async (ops: unknown[]) => ops),
    } as unknown as PrismaClient;
    const req = BulkEditRequest.parse({ kind: "submission", ids: ["a", "b"], set: { originCode: "et", originNameAr: "إثيوبيا", addNotes: ["توت", "خوخ"] } });
    expect(await bulkEdit(prisma, req)).toEqual({ updated: 2 });
    expect(update.mock.calls[0][0].data).toEqual({
      originName: "إثيوبيا", flavorNotes: ["توت", "خوخ"], extras: { adminEdited: ["process", "originName", "flavorNotes"] },
    });
    expect(update.mock.calls[1][0].data.flavorNotes).toEqual(["توت", "خوخ"]);
  });

  it("refuses an empty edit, and an origin without its name", () => {
    expect(BulkEditRequest.safeParse({ kind: "lot", ids: ["a"], set: {} }).success).toBe(false);
    expect(BulkEditRequest.safeParse({ kind: "lot", ids: ["a"], set: { originCode: "ET" } }).success).toBe(false);
  });

  it("writes a published coffee's roast in Arabic and its origin by country", async () => {
    const update = vi.fn((x) => x);
    const prisma = {
      originCountry: { findUnique: vi.fn().mockResolvedValue({ id: "o-et" }) },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([{ id: "l1", flavorNotes: [] }]), update },
      $transaction: vi.fn(async (ops: unknown[]) => ops),
    } as unknown as PrismaClient;
    await bulkEdit(prisma, BulkEditRequest.parse({ kind: "lot", ids: ["l1"], set: { originCode: "ET", originNameAr: "إثيوبيا", roastLevel: "light", process: "WASHED" } }));
    expect(update.mock.calls[0][0].data).toEqual({ originCountryId: "o-et", process: "WASHED", roastLevel: "فاتح" });
  });
});

describe("renameRoasterEn", () => {
  it("renames the roaster record and every suggestion under it", async () => {
    const update = vi.fn((x) => x);
    const prisma = {
      roaster: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      mobileCoffeeSubmission: {
        findMany: vi.fn().mockResolvedValue([{ id: "a", status: "PENDING", extras: {} }, { id: "b", status: "APPROVED", extras: {} }]),
        update,
      },
      $transaction: vi.fn(async (ops: unknown[]) => ops),
    } as unknown as PrismaClient;
    expect(await renameRoasterEn(prisma, { roasterAr: "محمصة صوت", nameEn: "Sout Roastery" })).toEqual({ roasters: 1, suggestions: 2 });
    expect(update.mock.calls[0][0].data).toEqual({ roasterNameEn: "Sout Roastery", extras: { adminEdited: ["roasterNameEn"] } });
    expect(update.mock.calls[1][0].data).toEqual({ roasterNameEn: "Sout Roastery" });
  });
});
