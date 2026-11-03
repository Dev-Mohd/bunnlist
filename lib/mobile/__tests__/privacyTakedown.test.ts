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
