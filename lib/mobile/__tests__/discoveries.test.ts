import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { newDiscoveries } from "../catalog";

const row = (id: string) => ({
  id, slug: id, name: id, nameAr: id, process: "WASHED", processLabel: null, flavorNotes: [], roastLevel: null,
  averageRating: 0, reviewCount: 0, imageUrl: null, roaster: { nameAr: "محمصة", name: "R" }, originCountry: null,
});

function fakePrisma(approved: { approvedLotId: string; accountId: string }[], newest: string[]) {
  const m = {
    mobileCoffeeSubmission: { findMany: vi.fn().mockResolvedValue(approved) },
    mobileProfile: { findMany: vi.fn().mockResolvedValue([{ accountId: "u1", username: "mohd", displayName: null }]) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    coffeeLot: {
      findMany: vi.fn()
        .mockResolvedValueOnce(approved.map((a) => row(a.approvedLotId)).reverse())
        .mockResolvedValueOnce(newest.map(row)),
    },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("newDiscoveries", () => {
  it("lists approved suggestions first, in review order, without naming who suggested them", async () => {
    const { db } = fakePrisma([{ approvedLotId: "a", accountId: "u1" }, { approvedLotId: "b", accountId: "deleted" }], ["c"]);
    const lots = await newDiscoveries(db, 3);
    expect(lots.map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(lots[0].discoveredBy).toBeNull();
    expect(lots[1].discoveredBy).toBeNull();
    expect(lots[2].discoveredBy).toBeNull();
  });
});
