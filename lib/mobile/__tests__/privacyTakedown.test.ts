import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { trendingRecipes } from "../home";
import { changeRecipeState } from "../recipes";

describe("trending recipes", () => {
  function db(follows: boolean) {
    return {
      mobileLike: { groupBy: vi.fn().mockResolvedValue([{ targetId: "rec1", _count: { _all: 3 } }]) },
      mobileBrewExperience: { groupBy: vi.fn().mockResolvedValue([]) },
      mobileRecipe: { findMany: vi.fn().mockResolvedValue([{ id: "rec1", title: "V60", methodCode: "v60", accountId: "owner", lotId: null }]) },
      mobileProfile: { findMany: vi.fn().mockResolvedValue([{ accountId: "owner", activityVisibility: "everyone", isPrivate: true, username: "owner", displayName: null }]) },
      mobileBlock: { findMany: vi.fn().mockResolvedValue([]) },
      mobileFollow: { findMany: vi.fn().mockResolvedValue(follows ? [{ followeeId: "owner" }] : []) },
      coffeeLot: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;
  }

  it("leaves out a private account's recipe for strangers and signed-out visitors", async () => {
    expect(await trendingRecipes(db(false), null)).toHaveLength(0);
    expect(await trendingRecipes(db(false), "stranger")).toHaveLength(0);
    expect(await trendingRecipes(db(true), "friend")).toHaveLength(1);
  });
});

describe("recipe takedown", () => {
  it("keeps a recipe an admin removed from being re-published by its author", async () => {
    const m = {
      mobileRecipe: { findUnique: vi.fn().mockResolvedValue({ id: "rec1", accountId: "owner", state: "unpublished", steps: [] }), update: vi.fn() },
      mobileReport: { findFirst: vi.fn().mockResolvedValue({ id: "rep1" }) },
    };
    await expect(changeRecipeState(m as unknown as PrismaClient, "owner", "rec1", "published")).rejects.toMatchObject({ reason: "recipe_removed" });
    expect(m.mobileRecipe.update).not.toHaveBeenCalled();
  });
});

describe("suspension", () => {
  it("keeps a suspended account from publishing a brew note, but not from logging privately", async () => {
    const { saveExperience } = await import("../experiences");
    const m = {
      coffeeLot: { findFirst: vi.fn().mockResolvedValue({ id: "lot1" }), findUnique: vi.fn().mockResolvedValue({ id: "lot1" }) },
      mobileSuspension: { findUnique: vi.fn().mockResolvedValue({ until: null }) },
      mobileBrewExperience: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation(({ data }) => ({ id: "e1", revision: 1, version: 1, createdAt: new Date(), updatedAt: new Date(), ...data })) },
      mobileCollectionEntry: { upsert: vi.fn() },
      mobilePointEvent: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn().mockResolvedValue(0), upsert: vi.fn() },
    };
    const input = { clientId: "c1", methodCode: "v60", stars: 4, brewedAt: new Date().toISOString(), note: "spam", publish: true };
    await expect(saveExperience(m as unknown as PrismaClient, "acc", "lot-1", input as never)).rejects.toMatchObject({ reason: "suspended" });
    expect(m.mobileBrewExperience.create).not.toHaveBeenCalled();
  });
});

describe("account purge", () => {
  it("removes lists, comments, advisor runs, roaster follows and challenge completions", async () => {
    const { createPrismaAccountDeletionStore } = await import("../accountStore");
    const calls: string[] = [];
    const tx = new Proxy({}, {
      get: (_t, model: string) => new Proxy({}, {
        get: (_m, op: string) => async () => {
          calls.push(`${model}.${op}`);
          if (op === "findMany") return [{ id: "l1" }];
          if (op === "findUnique") return null;
          return { count: 0 };
        },
      }),
    });
    const prisma = new Proxy({}, {
      get: (_t, key: string) => (key === "$transaction" ? async (fn: (t: unknown) => Promise<void>) => fn(tx) : (tx as Record<string, unknown>)[key]),
    }) as unknown as PrismaClient;
    await createPrismaAccountDeletionStore(prisma).purge("acc");
    for (const c of ["mobileListItem.deleteMany", "mobileList.deleteMany", "mobileComment.deleteMany", "mobileAdvisorRun.deleteMany", "mobileRoasterFollow.deleteMany", "mobileChallengeCompletion.deleteMany"]) {
      expect(calls).toContain(c);
    }
  });
});
