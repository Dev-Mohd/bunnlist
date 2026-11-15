import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { chooseInviter, founderDirectory, inviterState, INVITER_WINDOW_DAYS } from "../founderPerks";

type P = { accountId: string; username: string | null; founderNumber: number | null; invitedById: string | null; displayName?: string | null };
const now = new Date("2026-11-20T10:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

function fake(profiles: P[], joined: Record<string, Date> = {}) {
  const rows = new Map(profiles.map((p) => [p.accountId, { ...p }]));
  return {
    rows,
    prisma: {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => (joined[where.id] ? { createdAt: joined[where.id], name: null } : null)),
        findMany: vi.fn().mockResolvedValue([]),
      },
      mobileRecipe: { groupBy: vi.fn().mockResolvedValue([{ accountId: "f1", _count: { _all: 3 } }]) },
      mobileProfile: {
        findUnique: vi.fn().mockImplementation(({ where }: { where: { accountId: string } }) => rows.get(where.accountId) ?? null),
        findFirst: vi.fn().mockImplementation(({ where }: { where: { username: { equals: string } } }) =>
          [...rows.values()].find((r) => r.username?.toLowerCase() === where.username.equals.toLowerCase() && r.founderNumber) ?? null),
        findMany: vi.fn().mockImplementation(() => [...rows.values()].filter((r) => r.founderNumber).sort((a, b) => a.founderNumber! - b.founderNumber!)
          .map((r) => ({ ...r, avatarPath: null, bio: null, socials: { tiktok: "x" }, displayName: r.displayName ?? null }))),
        groupBy: vi.fn().mockImplementation(() => {
          const counts = new Map<string, number>();
          for (const r of rows.values()) if (r.invitedById) counts.set(r.invitedById, (counts.get(r.invitedById) ?? 0) + 1);
          return [...counts].map(([invitedById, n]) => ({ invitedById, _count: { _all: n } }));
        }),
        updateMany: vi.fn().mockImplementation(({ where, data }: { where: { accountId: string }; data: Partial<P> }) => {
          const row = rows.get(where.accountId);
          if (!row || row.invitedById) return { count: 0 };
          Object.assign(row, data); return { count: 1 };
        }),
        create: vi.fn().mockImplementation(({ data }: { data: P }) => { rows.set(data.accountId, { ...data, username: data.username ?? null, founderNumber: data.founderNumber ?? null }); return data; }),
        count: vi.fn().mockImplementation(({ where }: { where: { invitedById: string } }) => [...rows.values()].filter((r) => r.invitedById === where.invitedById).length),
      },
      mobileNotificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      mobileDevice: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient,
  };
}

const founder: P = { accountId: "f1", username: "bushra", founderNumber: 2, invitedById: null, displayName: "بشرى" };

describe("founder invitations", () => {
  it("lists founders by number with their recipe and invitation counts", async () => {
    const { prisma } = fake([{ accountId: "f9", username: "z", founderNumber: 9, invitedById: null }, founder, { accountId: "u1", username: "a", founderNumber: null, invitedById: "f1" }]);
    const list = await founderDirectory(prisma);
    expect(list.map((f) => f.number)).toEqual([2, 9]);
    expect(list[0]).toMatchObject({ username: "bushra", displayName: "بشرى", recipeCount: 3, invitedCount: 1, socials: { tiktok: "x" } });
    expect(list[1]).toMatchObject({ recipeCount: 0, invitedCount: 0 });
  });
  it("a new account names its founder once", async () => {
    const { prisma, rows } = fake([founder, { accountId: "u1", username: "new", founderNumber: null, invitedById: null }], { u1: daysAgo(2) });
    expect(await inviterState(prisma, "u1", now)).toEqual({ invitedBy: null, canChoose: true });
    expect(await chooseInviter(prisma, "u1", "@Bushra", now, null)).toEqual({ invitedBy: "bushra", canChoose: false });
    expect(rows.get("u1")?.invitedById).toBe("f1");
    await expect(chooseInviter(prisma, "u1", "bushra", now, null)).rejects.toMatchObject({ reason: "inviter_already_set" });
    expect(await inviterState(prisma, "u1", now)).toEqual({ invitedBy: "bushra", canChoose: false });
  });
  it("works for an account with no profile row yet", async () => {
    const { prisma, rows } = fake([founder], { u2: daysAgo(0) });
    await chooseInviter(prisma, "u2", "bushra", now, null);
    expect(rows.get("u2")?.invitedById).toBe("f1");
  });
  it("refuses yourself, non-founders and old accounts", async () => {
    const { prisma } = fake([founder, { accountId: "u1", username: "plain", founderNumber: null, invitedById: null }],
      { f1: daysAgo(1), u1: daysAgo(1), old: daysAgo(INVITER_WINDOW_DAYS + 1) });
    await expect(chooseInviter(prisma, "f1", "bushra", now, null)).rejects.toMatchObject({ reason: "cannot_invite_yourself" });
    await expect(chooseInviter(prisma, "u1", "plain", now, null)).rejects.toMatchObject({ reason: "founder_not_found" });
    await expect(chooseInviter(prisma, "old", "bushra", now, null)).rejects.toMatchObject({ reason: "inviter_window_closed" });
    expect(await inviterState(prisma, null, now)).toEqual({ invitedBy: null, canChoose: false });
  });
});
