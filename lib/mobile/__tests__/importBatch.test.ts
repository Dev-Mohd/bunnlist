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
    expect(result).toEqual({ created: 1, alreadyImported: 1, alreadyInCatalog: 1, photos: 0, photoErrors: 0, remaining: 0, filled: 0 });
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
    expect(result.created).toBe(953);
    expect(result.photos).toBe(793); // 24 Black Knight + 16 Arriyadh Roaster + 22 Bunista + 23 ASH + 11 SHOVEL + 20 Roasting House + 13 Camel Step + 132 Yahim Cups + 490 from the roasters' own stores + 42 Sout and Asante
    expect(store.put).toHaveBeenCalledWith(expect.stringMatching(/^imports\/bk-milora-[0-9a-f]{8}\.jpg$/), expect.any(Buffer));
    expect(store.put).toHaveBeenCalledWith(expect.stringMatching(/^imports\/ar-shmaisy-street-[0-9a-f]{8}\.jpg$/), expect.any(Buffer));
  });

  it("refreshes a pending import and gives it its photo", async () => {
    const m = {
      mobileCoffeeSubmission: {
        findMany: vi.fn().mockResolvedValue([{ id: "s1", importKey: "k1", status: "PENDING", photoPath: null }]),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn(),
      },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const store = { put: vi.fn().mockResolvedValue(undefined), signedUrl: vi.fn(), publish: vi.fn() };
    const withPhoto = { ...item("k1", "ميلورا"), extras: { photo: "bk-x" } };
    const result = await importBatch(m as unknown as PrismaClient, { batch: "t", items: [withPhoto] }, { "bk-x": "AAAA" }, store);
    expect(result).toMatchObject({ created: 0, alreadyImported: 1, photos: 1 });
    expect(m.mobileCoffeeSubmission.update.mock.calls[0][0].data).toMatchObject({ name: "ميلورا", photoPath: expect.stringMatching(/^imports\/bk-x-[0-9a-f]{8}\.jpg$/) });
  });

  it("passes over a pending import that already matches, and leaves work past the time limit for the next run", async () => {
    const same = { ...item("k1", "ميلورا"), extras: { b: 1, a: [1] } };
    const changed = item("k2", "قيدب");
    const rows = [
      { id: "s1", importKey: "k1", status: "PENDING", photoPath: null, name: "ميلورا", nameEn: same.nameEn, roasterName: same.roasterName,
        roasterNameEn: same.roasterNameEn ?? null, originName: same.originName ?? null, process: same.process ?? null, roastLevel: same.roastLevel,
        flavorNotes: same.flavorNotes, sourceUrl: same.sourceUrl ?? null, sourceConfidence: same.sourceConfidence ?? null, extras: { a: [1], b: 1 } },
      { id: "s2", importKey: "k2", status: "PENDING", photoPath: null, name: "قديم" },
    ];
    const m = {
      mobileCoffeeSubmission: { findMany: vi.fn().mockResolvedValue(rows), update: vi.fn().mockResolvedValue({}), create: vi.fn() },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const late = await importBatch(m as unknown as PrismaClient, { batch: "t", items: [same, changed] }, {}, null, -1);
    expect(m.mobileCoffeeSubmission.update).not.toHaveBeenCalled();
    expect(late.remaining).toBe(1);
    await importBatch(m as unknown as PrismaClient, { batch: "t", items: [same, changed] });
    expect(m.mobileCoffeeSubmission.update).toHaveBeenCalledTimes(1);
    expect(m.mobileCoffeeSubmission.update.mock.calls[0][0].where).toEqual({ id: "s2" });
  });

  it("leaves what an admin set by hand on a waiting suggestion, and an edited photo", async () => {
    const it1 = { ...item("k1", "ميلورا"), extras: { photo: "bk-x" } };
    const m = {
      mobileCoffeeSubmission: {
        findMany: vi.fn().mockResolvedValue([{
          id: "s1", importKey: "k1", status: "PENDING", photoPath: "imports/edit-s1-aaaa.jpg", name: "قديم", originName: "كينيا",
          extras: { adminEdited: ["originName"], photoEdited: true, originalPhotoPath: "imports/bk-x-1.jpg" },
        }]),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn(),
      },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const store = { put: vi.fn(), signedUrl: vi.fn(), publish: vi.fn() };
    await importBatch(m as unknown as PrismaClient, { batch: "t", items: [it1] }, { "bk-x": "AAAA" }, store);
    expect(store.put).not.toHaveBeenCalled();
    const data = m.mobileCoffeeSubmission.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ name: "ميلورا", originName: "كينيا", extras: { photo: "bk-x", photoEdited: true, adminEdited: ["originName"] } });
    expect(data.photoPath).toBeUndefined();
  });

  it("turns extras into lot tags", () => {
    expect(tagsFrom({ isLuxury: true, isDecaf: true })).toEqual(["luxury", "decaf"]);
    expect(tagsFrom({})).toEqual([]);
  });

  it("swaps a newer photo onto an approved import's lot, once", async () => {
    const lot = { id: "L1", slug: "bk-milora", imageUrl: "https://x/lots/bk-milora-abc.jpg", imageType: "USER_UPLOADED" };
    const m = {
      mobileCoffeeSubmission: {
        findMany: vi.fn().mockResolvedValue([{ id: "s1", importKey: "k1", status: "APPROVED", photoPath: "imports/bk-x.jpg", approvedLotId: "L1" }]),
        update: vi.fn().mockResolvedValue({}),
      },
      coffeeLot: { findMany: vi.fn().mockResolvedValueOnce([lot]).mockResolvedValue([]), update: vi.fn().mockResolvedValue({}) },
    };
    const store = { put: vi.fn().mockResolvedValue(undefined), signedUrl: vi.fn(), publish: vi.fn().mockImplementation(async (_p: string, d: string) => `https://x/${d}`) };
    const withPhoto = { ...item("k1", "ميلورا"), extras: { photo: "bk-x" } };
    await importBatch(m as unknown as PrismaClient, { batch: "t", items: [withPhoto] }, { "bk-x": "AAAA" }, store);
    const url = m.coffeeLot.update.mock.calls[0][0].data.imageUrl as string;
    expect(url).toMatch(/^https:\/\/x\/lots\/bk-milora-[0-9a-f]{8}\.jpg$/);
    expect(m.mobileCoffeeSubmission.update.mock.calls[0][0].data.photoPath).toMatch(/^imports\/bk-x-[0-9a-f]{8}\.jpg$/);

    // Run again with the lot already on that photo: nothing to do.
    m.coffeeLot.findMany = vi.fn().mockResolvedValueOnce([{ ...lot, imageUrl: url }]).mockResolvedValue([]);
    await importBatch(m as unknown as PrismaClient, { batch: "t", items: [withPhoto] }, { "bk-x": "AAAA" }, store);
    expect(m.coffeeLot.update).toHaveBeenCalledTimes(1);
  });

  it("keeps going when one lot's photo won't go up", async () => {
    const lot = { id: "L1", slug: "bk-milora", imageUrl: "https://x/lots/bk-milora-abc.jpg", imageType: "USER_UPLOADED" };
    const m = {
      mobileCoffeeSubmission: {
        findMany: vi.fn().mockResolvedValue([{ id: "s1", importKey: "k1", status: "APPROVED", photoPath: "imports/bk-x.jpg", approvedLotId: "L1" }]),
        create: vi.fn().mockResolvedValue({}),
      },
      coffeeLot: { findMany: vi.fn().mockResolvedValueOnce([lot]).mockResolvedValue([]), update: vi.fn() },
    };
    const store = { put: vi.fn().mockResolvedValue(undefined), signedUrl: vi.fn(), publish: vi.fn().mockRejectedValue(new Error("exists")) };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await importBatch(m as unknown as PrismaClient,
      { batch: "t", items: [{ ...item("k1", "ميلورا"), extras: { photo: "bk-x" } }, item("k2", "جديدة")] }, { "bk-x": "AAAA" }, store);
    errors.mockRestore();
    expect(result).toMatchObject({ created: 1, photoErrors: 1 });
    expect(m.coffeeLot.update).not.toHaveBeenCalled();
  });

  it("leaves a lot alone when it was published from this same photo", async () => {
    const version = (await import("node:crypto")).createHash("sha1").update("AAAA").digest("hex").slice(0, 8);
    const m = {
      mobileCoffeeSubmission: {
        findMany: vi.fn().mockResolvedValue([{ id: "s1", importKey: "k1", status: "APPROVED", photoPath: `imports/bk-x-${version}.jpg`, approvedLotId: "L1" }]),
      },
      coffeeLot: {
        findMany: vi.fn().mockResolvedValueOnce([{ id: "L1", slug: "bk-milora", imageUrl: "https://x/lots/bk-milora-mvz1k2.jpg", imageType: "USER_UPLOADED" }]).mockResolvedValue([]),
        update: vi.fn(),
      },
    };
    const store = { put: vi.fn(), signedUrl: vi.fn(), publish: vi.fn() };
    await importBatch(m as unknown as PrismaClient, { batch: "t", items: [{ ...item("k1", "ميلورا"), extras: { photo: "bk-x" } }] }, { "bk-x": "AAAA" }, store);
    expect(store.put).not.toHaveBeenCalled();
    expect(store.publish).not.toHaveBeenCalled();
  });

  it("leaves new coffees for the next run once out of time", async () => {
    const m = {
      mobileCoffeeSubmission: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}) },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const result = await importBatch(m as unknown as PrismaClient, { batch: "t", items: [item("k1", "أولى"), item("k2", "ثانية")] }, {}, null, -1);
    expect(result).toMatchObject({ created: 0, remaining: 2 });
    expect(m.mobileCoffeeSubmission.create).not.toHaveBeenCalled();
  });

  it("fills a published coffee's missing details, and leaves what's set", async () => {
    const lot = {
      id: "L1", slug: "x", imageUrl: null, imageType: "NONE", process: "OTHER", flavorNotes: ["كراميل"], descriptionAr: null,
      regionAr: null, region: null, variety: "كاتورا", roastLevel: null, originCountry: { isoCode: "ET" },
    };
    const m = {
      mobileCoffeeSubmission: { findMany: vi.fn().mockResolvedValue([{ id: "s1", importKey: "k1", status: "APPROVED", photoPath: null, approvedLotId: "L1" }]) },
      coffeeLot: { findMany: vi.fn().mockResolvedValueOnce([lot]).mockResolvedValue([]), update: vi.fn().mockResolvedValue({}) },
    };
    const newer = { ...item("k1", "شيلشلي"), process: "NATURAL" as const, flavorNotes: ["توت"],
      extras: { descriptionAr: "مجففة بإيحاءات التوت", region: "يرقاتشيف", variety: ["هيرلوم"] } };
    const result = await importBatch(m as unknown as PrismaClient, { batch: "t", items: [newer] }, {}, null);
    expect(result.filled).toBe(1);
    expect(m.coffeeLot.update).toHaveBeenCalledWith({
      where: { id: "L1" }, data: { process: "NATURAL", descriptionAr: "مجففة بإيحاءات التوت", regionAr: "يرقاتشيف", roastLevel: "فاتح" },
    });
  });
});
