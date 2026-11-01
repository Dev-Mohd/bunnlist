import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { addComment, deleteComment, listComments } from "../comments";

function fakePrisma(opts: { activity?: string; follows?: boolean; recent?: number; role?: string } = {}) {
  const m = {
    mobileBrewExperience: { findFirst: vi.fn().mockResolvedValue({ accountId: "owner", lotId: "lot1" }) },
    mobileRecipe: { findFirst: vi.fn().mockResolvedValue(null) },
    coffeeLot: { findUnique: vi.fn().mockResolvedValue({ nameAr: "كونجا" }) },
    mobileProfile: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { accountId: string } }) =>
        where.accountId === "owner" ? { activityVisibility: opts.activity ?? "everyone", isPrivate: false } : { username: "me", avatarPath: null }),
      findMany: vi.fn().mockResolvedValue([{ accountId: "me", username: "me", avatarPath: null }]),
    },
    mobileFollow: { findUnique: vi.fn().mockResolvedValue(opts.follows ? { followerId: "me" } : null) },
    mobileSuspension: { findUnique: vi.fn().mockResolvedValue(null) },
    mobileComment: {
      count: vi.fn().mockResolvedValue(opts.recent ?? 0),
      create: vi.fn().mockImplementation(({ data }: { data: { body: string } }) => ({ id: "c1", body: data.body, createdAt: new Date() })),
      findMany: vi.fn().mockResolvedValue([{ id: "c1", accountId: "me", body: "حلوة", createdAt: new Date() }]),
      findUnique: vi.fn().mockResolvedValue({ id: "c1", accountId: "someone", targetType: "brew", targetId: "b1", deletedAt: null }),
      update: vi.fn().mockResolvedValue({}),
    },
    user: { findUnique: vi.fn().mockResolvedValue({ role: opts.role ?? "USER" }), findMany: vi.fn().mockResolvedValue([]) },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("comments", () => {
  it("adds a comment and tells the owner", async () => {
    const { db, m } = fakePrisma();
    const notify = vi.fn().mockResolvedValue(undefined);
    const c = await addComment(db, "me", "brew", "b1", "  طلعت حلوة  ", notify);
    expect(c).toMatchObject({ body: "طلعت حلوة", isMine: true, canDelete: true });
    expect(m.mobileComment.create).toHaveBeenCalledWith({ data: { targetType: "brew", targetId: "b1", accountId: "me", body: "طلعت حلوة" } });
    expect(notify).toHaveBeenCalledWith("owner", "كونجا");
  });

  it("slows down someone commenting too fast", async () => {
    const { db } = fakePrisma({ recent: 6 });
    await expect(addComment(db, "me", "brew", "b1", "مرحبا")).rejects.toMatchObject({ code: "rateLimited" });
  });

  it("hides a brew shared with followers only from people who don't follow", async () => {
    const { db } = fakePrisma({ activity: "followers" });
    await expect(listComments(db, "brew", "b1", "me")).rejects.toMatchObject({ code: "unprocessable" });
    const { db: friend } = fakePrisma({ activity: "followers", follows: true });
    expect((await listComments(friend, "brew", "b1", "me")).count).toBe(1);
  });

  it("lets the author, the post's owner or an admin delete, nobody else", async () => {
    const { db } = fakePrisma();
    await expect(deleteComment(db, "stranger", "c1")).rejects.toMatchObject({ code: "forbidden" });
    const { db: owner, m } = fakePrisma();
    await deleteComment(owner, "owner", "c1");
    expect(m.mobileComment.update).toHaveBeenCalled();
    const { db: admin, m: am } = fakePrisma({ role: "ADMIN" });
    await deleteComment(admin, "admin1", "c1");
    expect(am.mobileComment.update).toHaveBeenCalled();
  });
});
