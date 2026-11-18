import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  closeFounderPoll, createFounderPoll, FOUNDER_PICK_LIMIT, founderPoll, lotFounderPicks, setFounderPick, setPinnedRecipe, voteOnFounderPoll,
} from "../founderPerks";

type Prof = { accountId: string; founderNumber: number | null; username: string | null; displayName: string | null; avatarPath: null; pinnedRecipeId?: string | null };
function fake(profiles: Prof[]) {
  const profs = new Map(profiles.map((p) => [p.accountId, { ...p }]));
  const picks: { accountId: string; lotId: string }[] = [];
  const polls: { id: string; question: string; options: string[]; open: boolean; createdAt: Date }[] = [];
  const votes: { pollId: string; accountId: string; option: number }[] = [];
  const recipes = new Map([["r1", { accountId: "f1", state: "published" }], ["r2", { accountId: "f1", state: "draft" }], ["r3", { accountId: "u1", state: "published" }]]);
  const prisma = {
    coffeeLot: { findFirst: vi.fn().mockImplementation(({ where }: { where: { slug: string } }) => (where.slug.startsWith("lot") ? { id: "id-" + where.slug } : null)) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    mobileRecipe: { findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => recipes.get(where.id) ?? null) },
    mobileProfile: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { accountId: string } }) => profs.get(where.accountId) ?? null),
      findMany: vi.fn().mockImplementation(({ where }: { where: { accountId?: { in: string[] } } }) =>
        [...profs.values()].filter((p) => p.founderNumber && (!where.accountId || where.accountId.in.includes(p.accountId)))),
      update: vi.fn().mockImplementation(({ where, data }: { where: { accountId: string }; data: Partial<Prof> }) => Object.assign(profs.get(where.accountId)!, data)),
    },
    mobileFounderPick: {
      findMany: vi.fn().mockImplementation(({ where }: { where: { lotId: string } }) => picks.filter((p) => p.lotId === where.lotId)),
      findUnique: vi.fn().mockImplementation(({ where }: { where: { accountId_lotId: { accountId: string; lotId: string } } }) =>
        picks.find((p) => p.accountId === where.accountId_lotId.accountId && p.lotId === where.accountId_lotId.lotId) ?? null),
      count: vi.fn().mockImplementation(({ where }: { where: { accountId: string } }) => picks.filter((p) => p.accountId === where.accountId).length),
      create: vi.fn().mockImplementation(({ data }: { data: { accountId: string; lotId: string } }) => { picks.push(data); return data; }),
      deleteMany: vi.fn().mockImplementation(({ where }: { where: { accountId: string; lotId: string } }) => {
        for (let i = picks.length - 1; i >= 0; i--) if (picks[i].accountId === where.accountId && picks[i].lotId === where.lotId) picks.splice(i, 1);
        return { count: 1 };
      }),
    },
    mobileFounderPoll: {
      findFirst: vi.fn().mockImplementation(({ where }: { where?: { open?: boolean } } = {}) =>
        [...polls].filter((p) => where?.open === undefined || p.open === where.open).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null),
      updateMany: vi.fn().mockImplementation(({ data }: { data: { open: boolean } }) => { polls.filter((p) => p.open).forEach((p) => Object.assign(p, data)); return { count: 1 }; }),
      create: vi.fn().mockImplementation(({ data }: { data: { question: string; options: string[]; createdAt: Date } }) => {
        const row = { id: "p" + (polls.length + 1), open: true, ...data }; polls.push(row); return row;
      }),
    },
    mobileFounderVote: {
      findMany: vi.fn().mockImplementation(({ where }: { where: { pollId: string } }) => votes.filter((v) => v.pollId === where.pollId)),
      upsert: vi.fn().mockImplementation(({ where, update, create }: { where: { pollId_accountId: { pollId: string; accountId: string } }; update: { option: number }; create: { pollId: string; accountId: string; option: number } }) => {
        const row = votes.find((v) => v.pollId === where.pollId_accountId.pollId && v.accountId === where.pollId_accountId.accountId);
        if (row) row.option = update.option; else votes.push(create);
        return row ?? create;
      }),
    },
    mobileNotificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
    mobileDevice: { findMany: vi.fn().mockResolvedValue([]) },
  } as unknown as PrismaClient;
  return { prisma, picks, profs };
}
const f = (id: string, n: number | null, name: string): Prof => ({ accountId: id, founderNumber: n, username: id, displayName: name, avatarPath: null });

describe("founder picks", () => {
  it("only founders recommend a coffee, and can take it back", async () => {
    const { prisma } = fake([f("f2", 2, "بشرى"), f("f1", 1, "يوسف"), f("u1", null, "زائر")]);
    await expect(setFounderPick(prisma, "u1", "lot-a", true)).rejects.toMatchObject({ reason: "founders_only" });
    await setFounderPick(prisma, "f2", "lot-a", true);
    const after = await setFounderPick(prisma, "f1", "lot-a", true);
    expect(after.picks.map((p) => p.number)).toEqual([1, 2]);
    expect(after).toMatchObject({ canPick: true, pickedByMe: true });
    expect(await lotFounderPicks(prisma, "lot-a", "u1")).toMatchObject({ canPick: false, pickedByMe: false });
    expect((await setFounderPick(prisma, "f1", "lot-a", false)).picks.map((p) => p.number)).toEqual([2]);
    await expect(lotFounderPicks(prisma, "nope", null)).rejects.toMatchObject({ reason: "lot_not_found" });
  });
  it("stops at the limit, and picking twice counts once", async () => {
    const { prisma, picks } = fake([f("f1", 1, "يوسف")]);
    for (let i = 0; i < FOUNDER_PICK_LIMIT; i++) await setFounderPick(prisma, "f1", "lot-" + i, true);
    await setFounderPick(prisma, "f1", "lot-0", true);
    expect(picks.length).toBe(FOUNDER_PICK_LIMIT);
    await expect(setFounderPick(prisma, "f1", "lot-extra", true)).rejects.toMatchObject({ reason: "pick_limit_reached" });
  });
});

describe("pinned recipe", () => {
  it("is a founder's own published recipe, or nothing", async () => {
    const { prisma, profs } = fake([f("f1", 1, "يوسف"), f("u1", null, "زائر")]);
    expect(await setPinnedRecipe(prisma, "f1", "r1")).toEqual({ pinnedRecipeId: "r1" });
    expect(profs.get("f1")?.pinnedRecipeId).toBe("r1");
    await expect(setPinnedRecipe(prisma, "f1", "r2")).rejects.toMatchObject({ reason: "recipe_not_found" }); // a draft
    await expect(setPinnedRecipe(prisma, "f1", "r3")).rejects.toMatchObject({ reason: "recipe_not_found" }); // someone else's
    await expect(setPinnedRecipe(prisma, "u1", "r3")).rejects.toMatchObject({ reason: "founders_only" });
    expect(await setPinnedRecipe(prisma, "f1", null)).toEqual({ pinnedRecipeId: null });
  });
});

describe("founders' polls", () => {
  it("founders vote once and can change it; others don't see it", async () => {
    const { prisma } = fake([f("f1", 1, "يوسف"), f("f2", 2, "بشرى"), f("u1", null, "زائر"), f("admin", null, "الفريق")]);
    expect(await founderPoll(prisma, "f1")).toBeNull();
    const made = await createFounderPoll(prisma, "admin", { question: "وش الميزة الجاية؟", options: ["أ", "ب", "ج"] }, new Date("2026-11-20"), null);
    expect(made).toMatchObject({ open: true, canVote: false, totalVotes: 0 }); // an admin who isn't a founder sees it but doesn't vote
    expect(await founderPoll(prisma, "u1")).toBeNull();
    expect(await founderPoll(prisma, null)).toBeNull();
    await voteOnFounderPoll(prisma, "f1", 0);
    await voteOnFounderPoll(prisma, "f2", 1);
    const changed = await voteOnFounderPoll(prisma, "f1", 1);
    expect(changed.options.map((o) => o.votes)).toEqual([0, 2, 0]);
    expect(changed).toMatchObject({ totalVotes: 2, myVote: 1, canVote: true });
    await expect(voteOnFounderPoll(prisma, "f1", 7)).rejects.toMatchObject({ reason: "invalid_option" });
    await expect(voteOnFounderPoll(prisma, "u1", 0)).rejects.toMatchObject({ reason: "founders_only" });
  });
  it("a closed poll keeps its results and takes no more votes; a new one closes the old", async () => {
    const { prisma } = fake([f("f1", 1, "يوسف"), f("admin", null, "الفريق")]);
    await createFounderPoll(prisma, "admin", { question: "الأول؟", options: ["أ", "ب"] }, new Date("2026-11-20"), null);
    await voteOnFounderPoll(prisma, "f1", 1);
    expect(await closeFounderPoll(prisma, "admin")).toMatchObject({ open: false, totalVotes: 1 });
    expect(await founderPoll(prisma, "f1")).toMatchObject({ open: false, canVote: false, myVote: 1 });
    await expect(voteOnFounderPoll(prisma, "f1", 0)).rejects.toMatchObject({ reason: "no_open_poll" });
    const next = await createFounderPoll(prisma, "admin", { question: "الثاني؟", options: ["أ", "ب"] }, new Date("2026-11-21"), null);
    expect(next).toMatchObject({ question: "الثاني؟", open: true, totalVotes: 0 });
  });
});
