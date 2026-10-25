import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { lotCommunity, lotDiscoverer } from "../lotCommunity";

function fake(submission: { accountId: string; publicNote: string | null } | null) {
  const m = {
    mobileCoffeeSubmission: { findFirst: vi.fn().mockResolvedValue(submission) },
    mobileProfile: {
      findMany: vi.fn().mockResolvedValue([{ accountId: "a", username: "shumukh", displayName: "Shumukh" }]),
      findUnique: vi.fn().mockResolvedValue({ username: "shumukh", avatarPath: null }),
    },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    mobileCollectionEntry: { count: vi.fn().mockResolvedValue(7) },
    mobileBrewExperience: {
      findMany: vi.fn().mockResolvedValue([
        { accountId: "a", methodCode: "V60" }, { accountId: "a", methodCode: "V60" }, { accountId: "b", methodCode: "AEROPRESS" },
      ]),
    },
    review: { findMany: vi.fn().mockResolvedValue([{ userId: "u", brewMethod: "V60" }]) },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("lotDiscoverer", () => {
  it("returns the discoverer with their public note", async () => {
    const d = await lotDiscoverer(fake({ accountId: "a", publicNote: "رائعة" }).db, "lot");
    expect(d).toMatchObject({ username: "shumukh", note: "رائعة" });
    expect(d).not.toHaveProperty("accountId");
  });

  it("is null for catalog additions", async () => {
    expect(await lotDiscoverer(fake(null).db, "lot")).toBeNull();
  });
});

describe("lotCommunity", () => {
  it("counts collectors, distinct brewers and the method split", async () => {
    const c = await lotCommunity(fake(null).db, "lot");
    expect(c.collectors).toBe(7);
    expect(c.brewers).toBe(3);
    expect(c.methods).toEqual([{ method: "V60", count: 3 }, { method: "AEROPRESS", count: 1 }]);
  });
});
