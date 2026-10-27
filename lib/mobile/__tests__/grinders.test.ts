import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import bundled from "../data/grinders.json";
import { GrinderEdit, seedGrinders, setMyGrinder, updateGrinder } from "../grinders";

describe("grinder guide", () => {
  it("bundles 123 grinders across the six categories, 95 with photos", () => {
    expect(bundled.items).toHaveLength(123);
    expect(bundled.items.filter((g) => g.photo)).toHaveLength(95);
    expect(new Set(bundled.items.map((g) => g.id)).size).toBe(123);
  });

  it("seeding adds missing grinders, keeps edits, and only fills missing photos", async () => {
    const m = {
      mobileGrinder: {
        findMany: vi.fn().mockResolvedValue([{ id: "1zpresso-j", imageUrl: "https://cdn/custom.jpg" }, { id: "codex-d6", imageUrl: null }]),
        create: vi.fn(), update: vi.fn(),
      },
    };
    const result = await seedGrinders(m as unknown as PrismaClient, "https://x.app/");
    expect(result.created).toBe(121);
    expect(m.mobileGrinder.update).toHaveBeenCalledWith({
      where: { id: "codex-d6" }, data: { imageUrl: "https://x.app/grinders/codex-d6.jpg", imageCredit: expect.any(String) },
    });
    const first = m.mobileGrinder.create.mock.calls[0][0].data;
    expect(first).toMatchObject({ id: "1zpresso-j-max", category: "hand", imageUrl: "https://x.app/grinders/1zpresso-j-max.jpg" });
    expect(first.adjustment).toBeUndefined();
  });

  it("edits only what is sent and rejects a bad source link", async () => {
    const row = { id: "g", brand: "b", model: "m", variant: null, category: "hand", adjustment: "clicks", rangeMin: 0, rangeMax: 40,
      clicksPerRotation: null, micronsPerStep: 30, zeroGuideAr: null, notesAr: null, sources: [], imageUrl: null, imageCredit: null, published: true };
    const m = { mobileGrinder: { findUnique: vi.fn().mockResolvedValue({ id: "g" }), update: vi.fn().mockResolvedValue(row) } };
    await updateGrinder(m as unknown as PrismaClient, "g", GrinderEdit.parse({ micronsPerStep: 30, adjustment: "clicks" }));
    expect(m.mobileGrinder.update.mock.calls[0][0].data).toEqual({ micronsPerStep: 30, adjustment: "clicks" });
    expect(() => GrinderEdit.parse({ sources: [{ label: "x", url: "not a url" }] })).toThrow();
  });

  it("«مطحنتي» must be a published grinder", async () => {
    const m = { mobileGrinder: { findFirst: vi.fn().mockResolvedValue(null) }, mobileProfile: { upsert: vi.fn() } };
    await expect(setMyGrinder(m as unknown as PrismaClient, "a", "nope")).rejects.toThrow();
    await setMyGrinder(m as unknown as PrismaClient, "a", null);
    expect(m.mobileProfile.upsert).toHaveBeenCalledTimes(1);
  });
});
