import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { personCoffees, searchPeople, suggestedPeople } from "../people";

const person = (accountId: string, over: Record<string, unknown> = {}) => ({
  accountId, username: accountId, displayName: null, avatarPath: null, isPrivate: false, activityVisibility: "everyone", ...over,
});

function fake() {
  const m = {
    mobileProfile: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
    mobileFollow: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null) },
    mobileFollowRequest: { findMany: vi.fn().mockResolvedValue([]) },
    mobileCollectionEntry: { findMany: vi.fn().mockResolvedValue([]), groupBy: vi.fn().mockResolvedValue([]) },
    mobileBrewExperience: { groupBy: vi.fn().mockResolvedValue([]) },
    mobileRecipe: { groupBy: vi.fn().mockResolvedValue([]) },
    coffeeLot: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { prisma: m as unknown as PrismaClient, m };
}

describe("searchPeople", () => {
  it("matches @username prefixes and names, with follow state, never the viewer", async () => {
    const { prisma, m } = fake();
    m.mobileProfile.findMany.mockResolvedValue([person("sara", { isPrivate: true }), person("saad")]);
    m.mobileFollowRequest.findMany.mockResolvedValue([{ targetId: "sara" }]);
    const found = await searchPeople(prisma, "me", "@Sa");
    expect(m.mobileProfile.findMany.mock.calls[0][0].where).toMatchObject({
      accountId: { not: "me" }, OR: [{ username: { startsWith: "sa" } }, { displayName: { contains: "Sa", mode: "insensitive" } }],
    });
    expect(found[0]).toMatchObject({ username: "sara", isPrivate: true, requested: true, isFollowing: false });
    expect(await searchPeople(prisma, "me", "s")).toEqual([]);
  });
});

describe("suggestedPeople", () => {
  it("ranks shared coffees, then the week's active, skipping private and followed accounts", async () => {
    const { prisma, m } = fake();
    m.mobileCollectionEntry.findMany.mockResolvedValue([{ lotId: "l1" }, { lotId: "l2" }]);
    m.mobileFollow.findMany.mockResolvedValueOnce([{ followeeId: "followed" }]).mockResolvedValue([]);
    m.mobileCollectionEntry.groupBy.mockResolvedValue([{ accountId: "twin", _count: { lotId: 4 } }, { accountId: "secret", _count: { lotId: 3 } }]);
    m.mobileBrewExperience.groupBy.mockResolvedValue([{ accountId: "busy", _count: { _all: 5 } }, { accountId: "twin", _count: { _all: 1 } }]);
    // The database leaves private accounts out (isPrivate: false in the query).
    m.mobileProfile.findMany.mockResolvedValue([person("twin"), person("busy")]);
    const { similar, active } = await suggestedPeople(prisma, "me", new Date("2026-11-01"));
    expect(m.mobileCollectionEntry.groupBy.mock.calls[0][0].where.accountId.notIn).toEqual(expect.arrayContaining(["me", "followed"]));
    expect(m.mobileProfile.findMany.mock.calls[0][0].where.isPrivate).toBe(false);
    expect(similar.map((p) => p.username)).toEqual(["twin"]);
    expect(similar[0].reasonAr).toBe("جربتوا ٤ قهاوي نفسها");
    expect(active.map((p) => p.username)).toEqual(["busy"]);
    expect(active[0].reasonAr).toContain("هالأسبوع");
  });
});

describe("personCoffees", () => {
  it("keeps a private account's shelves from people who don't follow it", async () => {
    const { prisma, m } = fake();
    m.mobileProfile.findUnique.mockResolvedValue({ accountId: "owner", activityVisibility: "everyone", isPrivate: true });
    await expect(personCoffees(prisma, "stranger", "owner", "owned")).rejects.toMatchObject({ code: "forbidden" });
    m.mobileFollow.findUnique.mockResolvedValue({ followerId: "friend" });
    m.mobileCollectionEntry.findMany.mockResolvedValue([
      { lotId: "l1", owned: true, favorite: true, wantsToTry: false, tried: true },
      { lotId: "l2", owned: false, favorite: false, wantsToTry: true, tried: false },
    ]);
    m.coffeeLot.findMany.mockResolvedValue([
      { id: "l1", slug: "a", nameAr: "أ", imageUrl: null, roaster: { nameAr: "ر" }, originCountry: null },
      { id: "l2", slug: "b", nameAr: "ب", imageUrl: null, roaster: { nameAr: "ر" }, originCountry: null },
    ]);
    const r = await personCoffees(prisma, "friend", "owner", "favorite");
    expect(r.counts).toEqual({ owned: 1, tried: 1, favorite: 1, wantsToTry: 1 });
    expect(r.coffees.map((c) => c.slug)).toEqual(["a"]);
  });
});
