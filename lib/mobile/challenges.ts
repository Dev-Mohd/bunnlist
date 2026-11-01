import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { FLAVOR_FAMILIES, flavorFamily } from "./flavorFamilies";
import { award } from "./points";

// «تحدي الأسبوع»: an admin sets an action (brew, rate or collect) on a number of
// different coffees matching some filters (origin, process, roaster, flavour),
// for a time window. Progress is counted from what people already do in the app;
// finishing pays the challenge's points once.

export const CHALLENGE_ACTIONS = ["brew", "rate", "collect"] as const;
export type ChallengeAction = (typeof CHALLENGE_ACTIONS)[number];

const iso = z.string().datetime({ offset: true });

const ChallengeBase = z.object({
  titleAr: z.string().trim().min(2).max(60),
  subtitleAr: z.string().trim().max(140).optional().nullable(),
  emoji: z.string().trim().max(8).optional().nullable(),
  action: z.enum(CHALLENGE_ACTIONS),
  originCode: z.string().trim().length(2).toUpperCase().optional().nullable(),
  process: z.string().trim().max(40).optional().nullable(),
  roasterSlug: z.string().trim().max(120).optional().nullable(),
  flavorFamily: z.enum(FLAVOR_FAMILIES).optional().nullable(),
  target: z.number().int().min(1).max(20).optional(),
  points: z.number().int().min(0).max(500).optional(),
  startsAt: iso,
  endsAt: iso,
});
export const ChallengeInput = ChallengeBase.refine((c) => new Date(c.endsAt) > new Date(c.startsAt), { message: "ends_before_start", path: ["endsAt"] });
export type ChallengeInput = z.infer<typeof ChallengeInput>;
export const ChallengeUpdate = ChallengeBase.partial();

type ChallengeRow = {
  id: string; titleAr: string; subtitleAr: string | null; emoji: string | null; action: string;
  originCode: string | null; process: string | null; roasterSlug: string | null; flavorFamily: string | null;
  target: number; points: number; startsAt: Date; endsAt: Date;
};

export interface MobileChallenge {
  id: string;
  titleAr: string;
  subtitleAr: string | null;
  emoji: string | null;
  action: ChallengeAction;
  /** Browse filters that list the coffees counting toward it. */
  filters: { originCode: string | null; process: string | null; roasterSlug: string | null; flavorFamily: string | null };
  target: number;
  points: number;
  startsAt: string;
  endsAt: string;
}

export interface ChallengeState {
  challenge: MobileChallenge | null;
  /** People who did it at least once / finished it. */
  participants: number;
  finished: number;
  /** The caller's progress, when signed in. */
  me: { progress: number; completed: boolean; justCompleted: boolean } | null;
}

export function mapChallenge(c: ChallengeRow): MobileChallenge {
  return {
    id: c.id, titleAr: c.titleAr, subtitleAr: c.subtitleAr, emoji: c.emoji, action: c.action as ChallengeAction,
    filters: { originCode: c.originCode, process: c.process, roasterSlug: c.roasterSlug, flavorFamily: c.flavorFamily },
    target: c.target, points: c.points, startsAt: c.startsAt.toISOString(), endsAt: c.endsAt.toISOString(),
  };
}

/** Does a coffee count toward the challenge? */
export function lotMatches(
  c: Pick<ChallengeRow, "originCode" | "process" | "roasterSlug" | "flavorFamily">,
  lot: { originCode: string | null; process: string; roasterSlug: string; flavorNotes: string[] },
): boolean {
  if (c.originCode && lot.originCode?.toUpperCase() !== c.originCode.toUpperCase()) return false;
  if (c.process && lot.process !== c.process) return false;
  if (c.roasterSlug && lot.roasterSlug !== c.roasterSlug) return false;
  if (c.flavorFamily && !lot.flavorNotes.some((n) => flavorFamily(n) === c.flavorFamily)) return false;
  return true;
}

/** Different coffees per person: "rated three coffees" means three, not one three times. */
export function progressByAccount(rows: { accountId: string; lotId: string }[]): Map<string, number> {
  const sets = new Map<string, Set<string>>();
  for (const r of rows) sets.set(r.accountId, (sets.get(r.accountId) ?? new Set()).add(r.lotId));
  return new Map([...sets].map(([id, lots]) => [id, lots.size]));
}

async function matchingLotIds(prisma: PrismaClient, c: ChallengeRow): Promise<string[]> {
  const lots = await prisma.coffeeLot.findMany({
    where: {
      publishedAt: { not: null },
      ...(c.originCode ? { originCountry: { isoCode: c.originCode.toUpperCase() } } : {}),
      ...(c.process ? { process: c.process as never } : {}),
      ...(c.roasterSlug ? { roaster: { slug: c.roasterSlug } } : {}),
    },
    select: { id: true, process: true, flavorNotes: true, originCountry: { select: { isoCode: true } }, roaster: { select: { slug: true } } },
  });
  return lots
    .filter((l) => lotMatches(c, { originCode: l.originCountry?.isoCode ?? null, process: l.process, roasterSlug: l.roaster.slug, flavorNotes: l.flavorNotes }))
    .map((l) => l.id);
}

/** Every qualifying (account, coffee) pair in the window. */
async function actions(prisma: PrismaClient, c: ChallengeRow, lotIds: string[], accountId?: string): Promise<{ accountId: string; lotId: string }[]> {
  if (!lotIds.length) return [];
  const window = { gte: c.startsAt, lt: c.endsAt };
  switch (c.action as ChallengeAction) {
    case "brew":
      return prisma.mobileBrewExperience.findMany({
        where: { lotId: { in: lotIds }, state: { not: "deleted" }, createdAt: window, ...(accountId ? { accountId } : {}) },
        select: { accountId: true, lotId: true },
      });
    case "rate":
      return (await prisma.review.findMany({
        where: { coffeeLotId: { in: lotIds }, status: "PUBLISHED", createdAt: window, ...(accountId ? { userId: accountId } : {}) },
        select: { userId: true, coffeeLotId: true },
      })).map((r) => ({ accountId: r.userId, lotId: r.coffeeLotId }));
    case "collect":
      return prisma.mobileCollectionEntry.findMany({
        where: { lotId: { in: lotIds }, createdAt: window, ...(accountId ? { accountId } : {}) },
        select: { accountId: true, lotId: true },
      });
  }
}

/** The running challenge, how many joined and finished, and the caller's progress (finishing it pays once). */
export async function currentChallenge(prisma: PrismaClient, viewerId: string | null, now = new Date()): Promise<ChallengeState> {
  const c = await prisma.mobileChallenge.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gt: now } }, orderBy: { startsAt: "desc" },
  });
  if (!c) return { challenge: null, participants: 0, finished: 0, me: null };
  const lotIds = await matchingLotIds(prisma, c);
  const all = progressByAccount(await actions(prisma, c, lotIds));
  let me: ChallengeState["me"] = null;
  if (viewerId) {
    const progress = all.get(viewerId) ?? 0;
    let completed = !!(await prisma.mobileChallengeCompletion.findUnique({
      where: { challengeId_accountId: { challengeId: c.id, accountId: viewerId } },
    }));
    let justCompleted = false;
    if (!completed && progress >= c.target) {
      try {
        await prisma.mobileChallengeCompletion.create({ data: { challengeId: c.id, accountId: viewerId } });
        justCompleted = true;
      } catch {
        // Finished in another request at the same time.
      }
      completed = true;
      if (justCompleted) await award(prisma, viewerId, "challenge", c.id, now, c.points);
    }
    me = { progress: Math.min(progress, c.target), completed, justCompleted };
  }
  const finished = await prisma.mobileChallengeCompletion.count({ where: { challengeId: c.id } });
  return { challenge: mapChallenge(c), participants: all.size, finished, me };
}

// MARK: Admin

export async function listChallenges(prisma: PrismaClient): Promise<(MobileChallenge & { finished: number })[]> {
  const rows = await prisma.mobileChallenge.findMany({ orderBy: { startsAt: "desc" }, take: 30 });
  const counts = rows.length
    ? await prisma.mobileChallengeCompletion.groupBy({ by: ["challengeId"], where: { challengeId: { in: rows.map((r) => r.id) } }, _count: { _all: true } })
    : [];
  const by = new Map(counts.map((c) => [c.challengeId, c._count._all]));
  return rows.map((r) => ({ ...mapChallenge(r), finished: by.get(r.id) ?? 0 }));
}

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export async function createChallenge(prisma: PrismaClient, adminId: string, input: ChallengeInput): Promise<MobileChallenge> {
  const row = await prisma.mobileChallenge.create({
    data: {
      titleAr: input.titleAr, subtitleAr: clean(input.subtitleAr), emoji: clean(input.emoji), action: input.action,
      originCode: clean(input.originCode), process: clean(input.process), roasterSlug: clean(input.roasterSlug),
      flavorFamily: clean(input.flavorFamily), target: input.target ?? 1, points: input.points ?? 50,
      startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), createdBy: adminId,
    },
  });
  return mapChallenge(row);
}

export async function updateChallenge(prisma: PrismaClient, id: string, input: z.infer<typeof ChallengeUpdate>): Promise<MobileChallenge> {
  const existing = await prisma.mobileChallenge.findUnique({ where: { id } });
  if (!existing) throw ApiError.unprocessable("challenge_not_found");
  const startsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
  const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
  if (endsAt <= startsAt) throw ApiError.unprocessable("ends_before_start");
  const row = await prisma.mobileChallenge.update({
    where: { id },
    data: {
      ...(input.titleAr !== undefined ? { titleAr: input.titleAr } : {}),
      ...(input.subtitleAr !== undefined ? { subtitleAr: clean(input.subtitleAr) } : {}),
      ...(input.emoji !== undefined ? { emoji: clean(input.emoji) } : {}),
      ...(input.action !== undefined ? { action: input.action } : {}),
      ...(input.originCode !== undefined ? { originCode: clean(input.originCode) } : {}),
      ...(input.process !== undefined ? { process: clean(input.process) } : {}),
      ...(input.roasterSlug !== undefined ? { roasterSlug: clean(input.roasterSlug) } : {}),
      ...(input.flavorFamily !== undefined ? { flavorFamily: clean(input.flavorFamily) } : {}),
      ...(input.target !== undefined ? { target: input.target } : {}),
      ...(input.points !== undefined ? { points: input.points } : {}),
      startsAt, endsAt,
    },
  });
  return mapChallenge(row);
}

export async function deleteChallenge(prisma: PrismaClient, id: string): Promise<{ ok: true }> {
  await prisma.mobileChallenge.deleteMany({ where: { id } });
  return { ok: true };
}
