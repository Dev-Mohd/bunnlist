import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { applyUserAction, assertCanPost, broadcast, searchUsers, UserAction } from "../adminUsers";

describe("suspensions", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const p = (row: unknown) => ({ mobileSuspension: { findUnique: vi.fn().mockResolvedValue(row) } }) as unknown as PrismaClient;

  it("blocks posting while active, indefinitely or until a date", async () => {
    await expect(assertCanPost(p(null), "a", now)).resolves.toBeUndefined();
    await expect(assertCanPost(p({ until: null }), "a", now)).rejects.toThrow();
    await expect(assertCanPost(p({ until: new Date("2026-11-04") }), "a", now)).rejects.toThrow();
    await expect(assertCanPost(p({ until: new Date("2026-11-01") }), "a", now)).resolves.toBeUndefined();
  });

  it("never acts on yourself or suspends an admin", async () => {
    const m = { user: { findUnique: vi.fn().mockResolvedValue({ role: "ADMIN" }) }, mobileSuspension: { upsert: vi.fn() } };
    const prisma = m as unknown as PrismaClient;
    const suspend = UserAction.parse({ action: "suspend", reason: "إزعاج", days: 7 });
    await expect(applyUserAction(prisma, "me", "me", suspend, now)).rejects.toThrow();
    await expect(applyUserAction(prisma, "me", "other", suspend, now)).rejects.toThrow();
    expect(m.mobileSuspension.upsert).not.toHaveBeenCalled();
  });
});

describe("broadcast", () => {
  it("a test goes to the sender only, and is logged", async () => {
    const m = {
      mobileNotificationSettings: { findUnique: vi.fn().mockResolvedValue(null) },
      mobilePushDevice: { findMany: vi.fn().mockResolvedValue([{ token: "t", environment: "sandbox" }]) },
      mobileBroadcast: { create: vi.fn() },
    };
    const sender = vi.fn().mockResolvedValue({ status: 200 });
    const result = await broadcast(m as unknown as PrismaClient, "admin", { title: "جديد", body: "قهوات جديدة", audience: "test" }, sender);
    expect(result).toEqual({ accounts: 1, delivered: 1 });
    expect(sender.mock.calls[0][1]).toMatchObject({ title: "جديد", data: { kind: "announcements" } });
    expect(m.mobileBroadcast.create.mock.calls[0][0].data).toMatchObject({ audience: "test", accounts: 1, delivered: 1 });
  });

  it("skips people who turned announcements off", async () => {
    const m = {
      mobilePushDevice: {
        findMany: vi.fn().mockImplementation(async ({ distinct }: { distinct?: string[] }) =>
          (distinct ? [{ accountId: "a" }, { accountId: "b" }] : [{ token: "t", environment: "production" }])),
      },
      mobileNotificationSettings: {
        findUnique: vi.fn().mockImplementation(async ({ where }: { where: { accountId: string } }) =>
          (where.accountId === "b" ? { announcements: false } : null)),
      },
      mobileBroadcast: { create: vi.fn() },
    };
    const sender = vi.fn().mockResolvedValue({ status: 200 });
    const result = await broadcast(m as unknown as PrismaClient, "admin", { title: "جديد", body: "قهوات جديدة", audience: "all" }, sender);
    expect(result).toEqual({ accounts: 2, delivered: 1 });
  });
});

describe("admin users: search filters", () => {
  const profile = { accountId: "a", username: "mohd", displayName: "محمد", avatarPath: null, createdAt: new Date("2026-11-01T00:00:00Z"), founderNumber: 1 };
  function db() {
    return {
      user: { findMany: vi.fn().mockResolvedValue([{ id: "a", role: "ADMIN" }]) },
      mobileProfile: { findMany: vi.fn().mockResolvedValue([profile]) },
      mobileSuspension: { findMany: vi.fn().mockResolvedValue([]) },
      mobilePointEvent: {
        findMany: vi.fn().mockResolvedValue([{ accountId: "a" }]),
        groupBy: vi.fn().mockResolvedValue([{ accountId: "a", _max: { day: "2026-11-09" } }]),
      },
    };
  }

  it("returns the last active day and narrows to accounts active this week", async () => {
    const m = db();
    const rows = await searchUsers(m as unknown as PrismaClient, "", new Date("2026-11-10T12:00:00Z"), "active");
    expect(rows[0]).toMatchObject({ accountId: "a", isAdmin: true, founderNumber: 1, lastActiveDay: "2026-11-09" });
    expect(m.mobilePointEvent.findMany.mock.calls[0][0].where).toEqual({ kind: "activity", day: { gte: "2026-11-04" } });
    expect(m.mobileProfile.findMany.mock.calls[0][0].where).toMatchObject({ AND: [{ accountId: { in: ["a"] } }] });
  });

  it("lists founders by number", async () => {
    const m = db();
    await searchUsers(m as unknown as PrismaClient, "", new Date("2026-11-10T12:00:00Z"), "founders");
    const args = m.mobileProfile.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ founderNumber: { not: null } });
    expect(args.orderBy).toEqual({ founderNumber: "asc" });
  });
});
