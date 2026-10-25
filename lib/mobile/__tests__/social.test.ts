import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { follow, followList, publicProfile, unfollow } from "../social";

function fakePrisma(profiles: Record<string, string>) {
  const byUsername = new Map(Object.entries(profiles)); // username -> accountId
  const m = {
    mobileProfile: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { username?: string; accountId?: string } }) => {
        if (where.username !== undefined) {
          const id = byUsername.get(where.username);
          return id ? { accountId: id } : null;
        }
        return { username: "mohd", displayName: "Mohd", bio: "قهوة", avatarPath: null };
      }),
      findMany: vi.fn().mockResolvedValue([{ accountId: "b", username: "badr", displayName: null, avatarPath: null }]),
    },
    user: { findUnique: vi.fn().mockResolvedValue({ name: "Mohd" }) },
    mobilePointEvent: { aggregate: vi.fn().mockResolvedValue({ _sum: { points: 85 } }) },
    mobileFollow: {
      count: vi.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1),
      findUnique: vi.fn().mockResolvedValue({ followerId: "v" }),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([{ followerId: "b", followeeId: "a" }, { followerId: "nohandle", followeeId: "a" }]),
    },
    mobileCoffeeSubmission: { findMany: vi.fn().mockResolvedValue([]) },
    mobileRecipe: { findMany: vi.fn().mockResolvedValue([{ id: "r1", title: "صباحية", methodCode: "V60", lotId: null }]) },
    coffeeLot: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("publicProfile", () => {
  it("is found by @username and shows public parts with follow state", async () => {
    const { db } = fakePrisma({ mohd: "a" });
    const p = await publicProfile(db, "@Mohd", "v");
    expect(p.username).toBe("mohd");
    expect(p.points).toBe(85);
    expect(p.followers).toBe(3);
    expect(p.isFollowing).toBe(true);
    expect(p.isMe).toBe(false);
    expect(p.recipes[0].title).toBe("صباحية");
    expect(p).not.toHaveProperty("accountId");
  });

  it("is missing for unknown usernames", async () => {
    await expect(publicProfile(fakePrisma({}).db, "nobody", null)).rejects.toMatchObject({ code: "unprocessable" });
  });
});

describe("following", () => {
  it("follows and unfollows, but never yourself", async () => {
    const { db, m } = fakePrisma({ mohd: "a" });
    await follow(db, "v", "mohd");
    expect(m.mobileFollow.upsert).toHaveBeenCalledOnce();
    await unfollow(db, "v", "mohd");
    expect(m.mobileFollow.deleteMany).toHaveBeenCalledWith({ where: { followerId: "v", followeeId: "a" } });
    await expect(follow(db, "a", "mohd")).rejects.toMatchObject({ code: "unprocessable" });
  });

  it("lists people that have a username", async () => {
    const people = await followList(fakePrisma({ mohd: "a" }).db, "mohd", "followers");
    expect(people).toEqual([{ username: "badr", displayName: null, avatarUrl: null }]);
  });
});
