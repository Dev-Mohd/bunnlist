import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { like, likeStates, unlike } from "../likes";

function fake(existing: boolean) {
  const m = {
    review: { findFirst: vi.fn().mockResolvedValue({ userId: "owner", coffeeLot: { nameAr: "خوخ" } }) },
    mobileRecipe: { findFirst: vi.fn().mockResolvedValue(null) },
    mobileLike: {
      findUnique: vi.fn().mockResolvedValue(existing ? { accountId: "v" } : null),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(4),
      groupBy: vi.fn().mockResolvedValue([{ targetId: "r1", _count: { _all: 4 } }]),
      findMany: vi.fn().mockResolvedValue([{ targetId: "r1" }]),
    },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("likes", () => {
  it("likes once, telling the author only the first time", async () => {
    const { db, m } = fake(false);
    const onNew = vi.fn().mockResolvedValue(undefined);
    expect(await like(db, "v", "review", "r1", onNew)).toEqual({ count: 4, liked: true });
    expect(m.mobileLike.upsert.mock.calls[0][0].create).toMatchObject({ ownerId: "owner", targetType: "review" });
    expect(onNew).toHaveBeenCalledWith("owner", "خوخ");
    const again = fake(true);
    await like(again.db, "v", "review", "r1", onNew);
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("refuses your own and missing things", async () => {
    await expect(like(fake(false).db, "owner", "review", "r1")).rejects.toMatchObject({ code: "unprocessable" });
    await expect(like(fake(false).db, "v", "recipe", "x")).rejects.toMatchObject({ code: "unprocessable" });
  });

  it("unlikes and reports states in bulk", async () => {
    const { db, m } = fake(true);
    expect(await unlike(db, "v", "review", "r1")).toEqual({ count: 4, liked: false });
    expect(m.mobileLike.deleteMany).toHaveBeenCalledWith({ where: { accountId: "v", targetType: "review", targetId: "r1" } });
    const states = await likeStates(db, "review", ["r1", "r2"], "v");
    expect(states.get("r1")).toEqual({ count: 4, liked: true });
    expect(states.get("r2")).toEqual({ count: 0, liked: false });
  });
});
