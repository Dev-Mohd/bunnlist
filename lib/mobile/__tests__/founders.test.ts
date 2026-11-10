import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  FOUNDER_LIMIT, founderBadge, founderStats, grantFounder, mergeSocials, publicSocials, readSocials, revokeFounder, socialHandle,
} from "../founders";
import { recipeBrewCounts } from "../recipeStats";

type Row = { accountId: string; founderNumber: number | null; founderAt: Date | null; socials: unknown };

function fake(start: Row[] = []) {
  const rows = new Map(start.map((r) => [r.accountId, { ...r }]));
  const m = {
    mobileProfile: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { accountId: string } }) => rows.get(where.accountId) ?? null),
      aggregate: vi.fn().mockImplementation(() => ({
        _max: { founderNumber: Math.max(0, ...[...rows.values()].map((r) => r.founderNumber ?? 0)) || null },
      })),
      upsert: vi.fn().mockImplementation(({ where, update, create }: { where: { accountId: string }; update: Partial<Row>; create: Row }) => {
        const taken = [...rows.values()].some((r) => r.accountId !== where.accountId && r.founderNumber === (update.founderNumber ?? create.founderNumber));
        if (taken) throw new Error("unique");
        const row = rows.get(where.accountId);
        if (row) Object.assign(row, update); else rows.set(where.accountId, { ...create });
        return rows.get(where.accountId);
      }),
      updateMany: vi.fn().mockImplementation(({ where, data }: { where: { accountId: string }; data: Partial<Row> }) => {
        const row = rows.get(where.accountId);
        if (row) Object.assign(row, data);
        return { count: row ? 1 : 0 };
      }),
    },
    mobileNotificationSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    mobilePushDevice: { findMany: vi.fn().mockResolvedValue([{ token: "t", environment: "production" }]), deleteMany: vi.fn() },
  };
  return { db: m as unknown as PrismaClient, rows };
}

describe("social handles", () => {
  it("accepts @handles, bare handles and profile links", () => {
    expect(socialHandle("tiktok", "@noura.brews")).toBe("noura.brews");
    expect(socialHandle("tiktok", "https://www.tiktok.com/@noura.brews?lang=ar")).toBe("noura.brews");
    expect(socialHandle("instagram", "instagram.com/noura_brews/")).toBe("noura_brews");
    expect(socialHandle("youtube", "https://youtube.com/@NouraBrews")).toBe("NouraBrews");
    expect(socialHandle("x", "https://twitter.com/noura")).toBe("noura");
  });

  it("refuses what isn't a handle", () => {
    expect(socialHandle("instagram", "نورة")).toBeNull();
    expect(socialHandle("tiktok", "has space")).toBeNull();
    expect(socialHandle("x", "a".repeat(16))).toBeNull();
    expect(socialHandle("tiktok", "")).toBeNull();
  });

  it("merges a patch: sets, clears, and refuses an invalid one", () => {
    const next = mergeSocials({ tiktok: "old", instagram: "keep" }, { tiktok: "@new", x: "", youtube: null });
    expect(next).toEqual({ tiktok: "new", instagram: "keep" });
    expect(() => mergeSocials({}, { instagram: "bad name" })).toThrow();
  });

  it("reads only known keys with valid handles", () => {
    expect(readSocials({ tiktok: "ok", facebook: "x", instagram: "bad name" })).toEqual({ tiktok: "ok" });
    expect(readSocials(null)).toEqual({});
  });

  it("shows socials and the badge for founders only", () => {
    expect(publicSocials({ founderNumber: null, socials: { tiktok: "a" } })).toBeNull();
    expect(publicSocials({ founderNumber: 3, socials: { tiktok: "a" } })).toEqual({ tiktok: "a" });
    expect(founderBadge({ founderNumber: 7 })).toEqual({ number: 7 });
    expect(founderBadge({ founderNumber: null })).toBeNull();
  });
});

describe("granting founders", () => {
  it("gives numbers in order, keeps an existing one, and notifies once", async () => {
    const { db, rows } = fake([{ accountId: "a", founderNumber: null, founderAt: null, socials: {} }]);
    const sender = vi.fn().mockResolvedValue({ status: 200 });
    expect(await grantFounder(db, "a", new Date(), sender)).toEqual({ number: 1, alreadyFounder: false });
    expect(await grantFounder(db, "b", new Date(), sender)).toEqual({ number: 2, alreadyFounder: false });
    expect(await grantFounder(db, "a", new Date(), sender)).toEqual({ number: 1, alreadyFounder: true });
    expect(rows.get("b")?.founderNumber).toBe(2);
    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender.mock.calls[0][1].title).toContain("مبدع مؤسس");
  });

  it("never reuses a revoked number, and clears socials", async () => {
    const { db, rows } = fake([
      { accountId: "a", founderNumber: 1, founderAt: new Date(), socials: { tiktok: "a" } },
      { accountId: "b", founderNumber: 2, founderAt: new Date(), socials: {} },
    ]);
    await revokeFounder(db, "a");
    expect(rows.get("a")).toMatchObject({ founderNumber: null, socials: {} });
    // Number 1 is free again, but the next one given is 3: numbers below the highest are never refilled.
    expect(await grantFounder(db, "c", new Date(), null)).toEqual({ number: 3, alreadyFounder: false });
  });

  it("stops at 100", async () => {
    const { db } = fake([{ accountId: "last", founderNumber: FOUNDER_LIMIT, founderAt: new Date(), socials: {} }]);
    await expect(grantFounder(db, "late", new Date(), null)).rejects.toMatchObject({ reason: "founders_full" });
    expect(await founderStats(db)).toEqual({ limit: 100, taken: 100, remaining: 0 });
  });
});

describe("recipe brew counts", () => {
  it("counts each person once, both id forms, and not the author", async () => {
    const db = {
      mobileBrewExperience: {
        findMany: vi.fn().mockResolvedValue([
          { recipeId: "r1", accountId: "x" },
          { recipeId: "recipe:r1", accountId: "x" },
          { recipeId: "recipe:r1", accountId: "y" },
          { recipeId: "r1", accountId: "author" },
          { recipeId: "recipe:r2", accountId: "z" },
        ]),
      },
    } as unknown as PrismaClient;
    const counts = await recipeBrewCounts(db, [{ id: "r1", accountId: "author" }, { id: "r2", accountId: "q" }, { id: "r3", accountId: "q" }]);
    expect(Object.fromEntries(counts)).toEqual({ r1: 2, r2: 1, r3: 0 });
  });
});
