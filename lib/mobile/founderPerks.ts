import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { readSocials, type Socials } from "./founders";
import { avatarUrl, displayNames } from "./profile";
import { notify, pushSender, type PushSender } from "./push";

// What founders get beyond the badge: a public page listing them, and credit for the
// people they bring in. A new account names the founder who invited it, once.

export interface FounderCard {
  number: number;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  socials: Socials;
  /** Published recipes. */
  recipeCount: number;
  /** Accounts that named this founder as the one who invited them. */
  invitedCount: number;
}

/** Every founder, by number. */
export async function founderDirectory(prisma: PrismaClient): Promise<FounderCard[]> {
  const profiles = await prisma.mobileProfile.findMany({
    where: { founderNumber: { not: null } },
    orderBy: { founderNumber: "asc" },
    select: { accountId: true, founderNumber: true, username: true, displayName: true, avatarPath: true, bio: true, socials: true },
  });
  if (profiles.length === 0) return [];
  const ids = profiles.map((p) => p.accountId);
  const [names, recipes, invited] = await Promise.all([
    displayNames(prisma, ids),
    prisma.mobileRecipe.groupBy({ by: ["accountId"], where: { accountId: { in: ids }, state: "published" }, _count: { _all: true } }),
    prisma.mobileProfile.groupBy({ by: ["invitedById"], where: { invitedById: { in: ids } }, _count: { _all: true } }),
  ]);
  const recipeCount = new Map(recipes.map((r) => [r.accountId, r._count._all]));
  const invitedCount = new Map(invited.map((r) => [r.invitedById, r._count._all]));
  return profiles.map((p) => ({
    number: p.founderNumber as number,
    username: p.username,
    displayName: p.displayName ?? names.get(p.accountId) ?? "مستخدم",
    avatarUrl: avatarUrl(p.avatarPath),
    bio: p.bio,
    socials: readSocials(p.socials),
    recipeCount: recipeCount.get(p.accountId) ?? 0,
    invitedCount: invitedCount.get(p.accountId) ?? 0,
  }));
}

/** How long after joining an account may still say who invited it. */
export const INVITER_WINDOW_DAYS = 30;

export interface InviterState {
  /** The founder this account named, as a @username; null when it hasn't. */
  invitedBy: string | null;
  /** Whether it may still name one. */
  canChoose: boolean;
}

export async function inviterState(prisma: PrismaClient, accountId: string | null, now = new Date()): Promise<InviterState> {
  if (!accountId) return { invitedBy: null, canChoose: false };
  const [profile, user] = await Promise.all([
    prisma.mobileProfile.findUnique({ where: { accountId }, select: { invitedById: true } }),
    prisma.user.findUnique({ where: { id: accountId }, select: { createdAt: true } }),
  ]);
  if (profile?.invitedById) {
    const inviter = await prisma.mobileProfile.findUnique({ where: { accountId: profile.invitedById }, select: { username: true } });
    return { invitedBy: inviter?.username ?? null, canChoose: false };
  }
  const joined = user?.createdAt ?? now;
  return { invitedBy: null, canChoose: now.getTime() - joined.getTime() <= INVITER_WINDOW_DAYS * 86_400_000 };
}

export const InviterChoice = z.object({ username: z.string().trim().min(1).max(40) });

/**
 * «هو اللي دعاني»: records the founder who invited the caller. Once only, within the first
 * month, never yourself, and only a founder. The founder hears about it.
 */
export async function chooseInviter(
  prisma: PrismaClient, accountId: string, username: string, now = new Date(), sender: PushSender | null = pushSender(),
): Promise<InviterState> {
  const state = await inviterState(prisma, accountId, now);
  if (state.invitedBy) throw ApiError.conflict("inviter_already_set");
  if (!state.canChoose) throw ApiError.forbidden("inviter_window_closed");
  const founder = await prisma.mobileProfile.findFirst({
    where: { username: { equals: username.replace(/^@+/, ""), mode: "insensitive" }, founderNumber: { not: null } },
    select: { accountId: true, username: true },
  });
  if (!founder) throw ApiError.unprocessable("founder_not_found");
  if (founder.accountId === accountId) throw ApiError.unprocessable("cannot_invite_yourself");
  // Only fills an empty inviter, so two taps at once record one.
  const existing = await prisma.mobileProfile.findUnique({ where: { accountId }, select: { accountId: true } });
  if (existing) {
    const done = await prisma.mobileProfile.updateMany({ where: { accountId, invitedById: null }, data: { invitedById: founder.accountId, invitedAt: now } });
    if (done.count === 0) throw ApiError.conflict("inviter_already_set");
  } else {
    await prisma.mobileProfile.create({ data: { accountId, invitedById: founder.accountId, invitedAt: now } });
  }
  const total = await prisma.mobileProfile.count({ where: { invitedById: founder.accountId } });
  await notify(prisma, founder.accountId, "announcements", {
    title: "انضم واحد عن طريقك ☕",
    body: total === 1 ? "أول شخص ينضم لـBunnList بدعوتك." : `صاروا ${total} انضموا لـBunnList بدعوتك.`,
    data: { kind: "founder" },
  }, sender).catch(() => undefined);
  return { invitedBy: founder.username, canChoose: false };
}
