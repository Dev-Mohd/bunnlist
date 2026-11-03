import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { block, unblock } from "../blocks";
import { blockedWith } from "../blockSet";
import { activityVisibleTo, follow } from "../social";
import { listComments } from "../comments";

const db = (m: object) => m as unknown as PrismaClient;
const blocks = (rows: { blockerId: string; blockedId: string }[]) => ({ findMany: vi.fn().mockResolvedValue(rows) });

describe("blocking", () => {
  it("blocks someone, ends follows and requests both ways, but never yourself or the team", async () => {
    const m = {
      mobileProfile: { findUnique: vi.fn().mockImplementation(({ where }) => ({ accountId: where.username === "me" ? "me" : where.username === "team" ? "admin" : "bad" })) },
      user: { findMany: vi.fn().mockResolvedValue([{ id: "admin" }]) },
      mobileBlock: { upsert: vi.fn(), deleteMany: vi.fn() },
      mobileFollow: { deleteMany: vi.fn() },
      mobileFollowRequest: { deleteMany: vi.fn() },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    await expect(block(db(m), "me", "bad")).resolves.toEqual({ blocked: true });
    expect(m.mobileBlock.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { blockerId: "me", blockedId: "bad" } }));
    expect(m.mobileFollow.deleteMany.mock.calls[0][0].where.OR).toHaveLength(2);
    await expect(block(db(m), "me", "me")).rejects.toMatchObject({ reason: "cannot_block_self" });
    await expect(block(db(m), "me", "team")).rejects.toMatchObject({ reason: "user_not_found" });
    await unblock(db(m), "me", "bad");
    expect(m.mobileBlock.deleteMany).toHaveBeenCalledWith({ where: { blockerId: "me", blockedId: "bad" } });
  });

  it("works both ways", async () => {
    const set = await blockedWith(db({ mobileBlock: blocks([{ blockerId: "me", blockedId: "a" }, { blockerId: "b", blockedId: "me" }]) }), "me");
    expect([...set].sort()).toEqual(["a", "b"]);
    expect((await blockedWith(db({}), null)).size).toBe(0);
  });

  it("hides a blocked person's activity and comments, and stops follows", async () => {
    const m = {
      mobileBlock: blocks([{ blockerId: "me", blockedId: "bad" }]),
      mobileProfile: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockImplementation(({ where }) => (where.username ? { accountId: "bad", isPrivate: false } : { activityVisibility: "everyone", isPrivate: false })) },
      mobileFollow: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null) },
      mobileBrewExperience: { findFirst: vi.fn().mockResolvedValue({ accountId: "owner", lotId: "l1" }) },
      coffeeLot: { findUnique: vi.fn().mockResolvedValue({ nameAr: "x" }) },
      mobileComment: { findMany: vi.fn().mockResolvedValue([{ id: "c1", accountId: "bad", body: "spam", createdAt: new Date() }, { id: "c2", accountId: "ok", body: "حلو", createdAt: new Date() }]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    };
    expect([...(await activityVisibleTo(db(m), "me", ["bad", "ok"]))]).toEqual(["ok"]);
    const { comments } = await listComments(db(m), "brew", "b1", "me");
    expect(comments.map((c) => c.id)).toEqual(["c2"]);
    await expect(follow(db(m), "me", "bad")).rejects.toMatchObject({ reason: "blocked" });
  });
});
