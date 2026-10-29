import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { activityVisibleTo, answerFollowRequest, follow, followList, publicProfile, removeFollower, unfollow } from "../social";

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
    mobileFollowRequest: {
      findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }), findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn().mockImplementation(async (ops: unknown[]) => ops),
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
    m.mobileFollow.findUnique.mockResolvedValueOnce(null);
    const onNew = vi.fn().mockResolvedValue(undefined);
    await follow(db, "v", "mohd", onNew);
    expect(m.mobileFollow.upsert).toHaveBeenCalledOnce();
    expect(onNew).toHaveBeenCalledWith("a", "follow");
    // Following again doesn't notify again.
    await follow(db, "v", "mohd", onNew);
    expect(onNew).toHaveBeenCalledOnce();
    await unfollow(db, "v", "mohd");
    expect(m.mobileFollow.deleteMany).toHaveBeenCalledWith({ where: { followerId: "v", followeeId: "a" } });
    expect(m.mobileFollowRequest.deleteMany).toHaveBeenCalledWith({ where: { requesterId: "v", targetId: "a" } });
    await expect(follow(db, "a", "mohd")).rejects.toMatchObject({ code: "unprocessable" });
  });

  it("lists people that have a username", async () => {
    const people = await followList(fakePrisma({ mohd: "a" }).db, "mohd", "followers");
    expect(people).toEqual([{ username: "badr", displayName: null, avatarUrl: null }]);
  });
});

describe("privacy", () => {
  function withPrivacy(levels: Record<string, string>, viewerFollows: boolean) {
    const { db, m } = fakePrisma({ mohd: "a" });
    m.mobileProfile.findUnique.mockImplementation(({ where }: { where: { username?: string; accountId?: string } }) =>
      where.username !== undefined ? { accountId: "a" } : { username: "mohd", displayName: "Mohd", bio: null, avatarPath: null, ...levels });
    m.mobileFollow.findUnique.mockResolvedValue(viewerFollows ? { followerId: "v" } : null);
    m.mobileCoffeeSubmission.findMany.mockResolvedValue([{ approvedLotId: "l1" }]);
    return { db, m };
  }

  it("hides counts and activity from people the owner left out", async () => {
    const { db } = withPrivacy({ followersVisibility: "followers", followingVisibility: "me", activityVisibility: "followers" }, false);
    const p = await publicProfile(db, "mohd", "v");
    expect(p.followers).toBeNull();
    expect(p.following).toBeNull();
    expect(p.activityHidden).toBe(true);
    expect(p.recipes).toEqual([]);
  });

  it("shows follower-only parts to followers, and everything to the owner", async () => {
    const asFollower = await publicProfile(withPrivacy({ followersVisibility: "followers", followingVisibility: "me" }, true).db, "mohd", "v");
    expect(asFollower.followers).toBe(3);
    expect(asFollower.following).toBeNull();
    const asOwner = await publicProfile(withPrivacy({ followersVisibility: "me", followingVisibility: "me", activityVisibility: "me" }, false).db, "mohd", "a");
    expect(asOwner.following).not.toBeNull();
    expect(asOwner.activityHidden).toBe(false);
  });

  it("refuses a hidden list", async () => {
    const { db } = withPrivacy({ followersVisibility: "me" }, true);
    await expect(followList(db, "mohd", "followers", "v")).rejects.toMatchObject({ code: "forbidden" });
    await expect(followList(db, "mohd", "followers", "a")).resolves.toBeDefined();
  });
});

describe("private accounts", () => {
  function privateOwner(viewerFollows: boolean) {
    const { db, m } = fakePrisma({ mohd: "a" });
    m.mobileProfile.findUnique.mockImplementation(({ where }: { where: { username?: string; accountId?: string } }) =>
      where.username !== undefined ? { accountId: "a" } : { username: "mohd", displayName: "Mohd", bio: null, avatarPath: null, isPrivate: true });
    m.mobileFollow.findUnique.mockResolvedValue(viewerFollows ? { followerId: "v" } : null);
    return { db, m };
  }

  it("turns a follow into a request, once", async () => {
    const { db, m } = privateOwner(false);
    const onNew = vi.fn().mockResolvedValue(undefined);
    expect(await follow(db, "v", "mohd", onNew)).toEqual({ following: false, requested: true });
    expect(m.mobileFollowRequest.create).toHaveBeenCalledWith({ data: { requesterId: "v", targetId: "a" } });
    expect(m.mobileFollow.upsert).not.toHaveBeenCalled();
    expect(onNew).toHaveBeenCalledWith("a", "request");
    m.mobileFollowRequest.findUnique.mockResolvedValue({ requesterId: "v" });
    await follow(db, "v", "mohd", onNew);
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("shows the header but keeps activity and lists for followers", async () => {
    const stranger = await publicProfile(privateOwner(false).db, "mohd", "v");
    expect(stranger.isPrivate).toBe(true);
    expect(stranger.followers).toBe(3);
    expect(stranger.activityHidden).toBe(true);
    expect(stranger.recipes).toEqual([]);
    await expect(followList(privateOwner(false).db, "mohd", "followers", "v")).rejects.toMatchObject({ code: "forbidden" });
    const follower = await publicProfile(privateOwner(true).db, "mohd", "v");
    expect(follower.activityHidden).toBe(false);
  });

  it("accepts a request into a follow, and declines quietly", async () => {
    const { db, m } = privateOwner(false);
    const told = vi.fn().mockResolvedValue(undefined);
    await answerFollowRequest(db, "a", "mohd", true, told);
    expect(m.mobileFollow.upsert).toHaveBeenCalledOnce();
    expect(told).toHaveBeenCalledWith("a");
    m.mobileFollow.upsert.mockClear();
    await answerFollowRequest(db, "a", "mohd", false, told);
    expect(m.mobileFollow.upsert).not.toHaveBeenCalled();
    await removeFollower(db, "a", "mohd");
    expect(m.mobileFollow.deleteMany).toHaveBeenCalledWith({ where: { followerId: "a", followeeId: "a" } });
  });

  it("says whose activity a viewer may see", async () => {
    const { db, m } = fakePrisma({});
    m.mobileProfile.findMany.mockResolvedValue([
      { accountId: "pub", activityVisibility: "everyone", isPrivate: false },
      { accountId: "priv", activityVisibility: "everyone", isPrivate: true },
      { accountId: "friend", activityVisibility: "everyone", isPrivate: true },
    ]);
    m.mobileFollow.findMany.mockResolvedValue([{ followeeId: "friend" }]);
    const seen = await activityVisibleTo(db, "v", ["pub", "priv", "friend", "v"]);
    expect([...seen].sort()).toEqual(["friend", "pub", "v"]);
  });
});
