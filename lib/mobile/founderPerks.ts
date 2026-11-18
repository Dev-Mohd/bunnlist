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

// MARK: Founder picks

/** How many coffees one founder can recommend at a time. */
export const FOUNDER_PICK_LIMIT = 12;

export interface FounderPick { number: number; username: string | null; displayName: string; avatarUrl: string | null }
export interface LotFounderPicks {
  picks: FounderPick[];
  /** The viewer is a founder and may recommend (or take back their recommendation). */
  canPick: boolean;
  pickedByMe: boolean;
}

async function publishedLotId(prisma: PrismaClient, slug: string): Promise<string> {
  const lot = await prisma.coffeeLot.findFirst({ where: { slug, publishedAt: { not: null } }, select: { id: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  return lot.id;
}

/** The founders who recommend a coffee, by founder number. */
export async function lotFounderPicks(prisma: PrismaClient, slug: string, viewerId: string | null): Promise<LotFounderPicks> {
  const lotId = await publishedLotId(prisma, slug);
  const rows = await prisma.mobileFounderPick.findMany({ where: { lotId }, select: { accountId: true } });
  const ids = rows.map((r) => r.accountId);
  const [profiles, names, viewer] = await Promise.all([
    ids.length
      ? prisma.mobileProfile.findMany({ where: { accountId: { in: ids }, founderNumber: { not: null } }, select: { accountId: true, founderNumber: true, username: true, displayName: true, avatarPath: true } })
      : Promise.resolve([]),
    displayNames(prisma, ids),
    viewerId ? prisma.mobileProfile.findUnique({ where: { accountId: viewerId }, select: { founderNumber: true } }) : null,
  ]);
  return {
    // Someone who is no longer a founder drops out of the list.
    picks: profiles
      .sort((a, b) => (a.founderNumber as number) - (b.founderNumber as number))
      .map((p) => ({ number: p.founderNumber as number, username: p.username, displayName: p.displayName ?? names.get(p.accountId) ?? "مستخدم", avatarUrl: avatarUrl(p.avatarPath) })),
    canPick: !!viewer?.founderNumber,
    pickedByMe: !!viewerId && ids.includes(viewerId),
  };
}

/** «رشّحها» / takes it back. Founders only, up to FOUNDER_PICK_LIMIT coffees. */
export async function setFounderPick(prisma: PrismaClient, accountId: string, slug: string, picked: boolean): Promise<LotFounderPicks> {
  const me = await prisma.mobileProfile.findUnique({ where: { accountId }, select: { founderNumber: true } });
  if (!me?.founderNumber) throw ApiError.forbidden("founders_only");
  const lotId = await publishedLotId(prisma, slug);
  if (picked) {
    const existing = await prisma.mobileFounderPick.findUnique({ where: { accountId_lotId: { accountId, lotId } } });
    if (!existing) {
      if ((await prisma.mobileFounderPick.count({ where: { accountId } })) >= FOUNDER_PICK_LIMIT) throw ApiError.unprocessable("pick_limit_reached");
      await prisma.mobileFounderPick.create({ data: { accountId, lotId } });
    }
  } else {
    await prisma.mobileFounderPick.deleteMany({ where: { accountId, lotId } });
  }
  return lotFounderPicks(prisma, slug, accountId);
}

// MARK: Pinned recipe

/** Sets (or, with null, clears) the recipe a founder shows first on their profile. It must be their own published recipe. */
export async function setPinnedRecipe(prisma: PrismaClient, accountId: string, recipeId: string | null): Promise<{ pinnedRecipeId: string | null }> {
  const me = await prisma.mobileProfile.findUnique({ where: { accountId }, select: { founderNumber: true } });
  if (!me?.founderNumber) throw ApiError.forbidden("founders_only");
  if (recipeId) {
    const recipe = await prisma.mobileRecipe.findUnique({ where: { id: recipeId }, select: { accountId: true, state: true } });
    if (!recipe || recipe.accountId !== accountId || recipe.state !== "published") throw ApiError.unprocessable("recipe_not_found");
  }
  await prisma.mobileProfile.update({ where: { accountId }, data: { pinnedRecipeId: recipeId } });
  return { pinnedRecipeId: recipeId };
}
export const PinnedRecipeInput = z.object({ recipeId: z.string().min(1).max(60).nullable() });

// MARK: Founder polls

export interface FounderPollView {
  id: string;
  question: string;
  options: { text: string; votes: number }[];
  totalVotes: number;
  /** The option the viewer chose, or null. */
  myVote: number | null;
  open: boolean;
  /** The viewer is a founder and the poll is open. */
  canVote: boolean;
}

export const FounderPollInput = z.object({
  question: z.string().trim().min(3).max(140),
  options: z.array(z.string().trim().min(1).max(60)).min(2).max(5),
});
export const FounderVoteInput = z.object({ option: z.number().int().min(0).max(4) });

/** The latest poll, for founders and admins; everyone else gets null. */
export async function founderPoll(prisma: PrismaClient, viewerId: string | null, isAdmin = false): Promise<FounderPollView | null> {
  if (!viewerId) return null;
  const me = await prisma.mobileProfile.findUnique({ where: { accountId: viewerId }, select: { founderNumber: true } });
  if (!me?.founderNumber && !isAdmin) return null;
  const poll = await prisma.mobileFounderPoll.findFirst({ orderBy: { createdAt: "desc" } });
  if (!poll) return null;
  const votes = await prisma.mobileFounderVote.findMany({ where: { pollId: poll.id }, select: { accountId: true, option: true } });
  const counts = poll.options.map((_, i) => votes.filter((v) => v.option === i).length);
  return {
    id: poll.id, question: poll.question,
    options: poll.options.map((text, i) => ({ text, votes: counts[i] })),
    totalVotes: votes.length,
    myVote: votes.find((v) => v.accountId === viewerId)?.option ?? null,
    open: poll.open,
    canVote: poll.open && !!me?.founderNumber,
  };
}

/** A founder's vote on the open poll; voting again changes it. */
export async function voteOnFounderPoll(prisma: PrismaClient, accountId: string, option: number): Promise<FounderPollView> {
  const me = await prisma.mobileProfile.findUnique({ where: { accountId }, select: { founderNumber: true } });
  if (!me?.founderNumber) throw ApiError.forbidden("founders_only");
  const poll = await prisma.mobileFounderPoll.findFirst({ where: { open: true }, orderBy: { createdAt: "desc" } });
  if (!poll) throw ApiError.conflict("no_open_poll");
  if (option >= poll.options.length) throw ApiError.unprocessable("invalid_option");
  await prisma.mobileFounderVote.upsert({
    where: { pollId_accountId: { pollId: poll.id, accountId } },
    update: { option, createdAt: new Date() },
    create: { pollId: poll.id, accountId, option },
  });
  return (await founderPoll(prisma, accountId)) as FounderPollView;
}

/** Admin: asks the founders a new question. Any poll still open is closed first, and the founders are told. */
export async function createFounderPoll(
  prisma: PrismaClient, adminId: string, input: z.infer<typeof FounderPollInput>, now = new Date(), sender: PushSender | null = pushSender(),
): Promise<FounderPollView> {
  await prisma.mobileFounderPoll.updateMany({ where: { open: true }, data: { open: false, closedAt: now } });
  await prisma.mobileFounderPoll.create({ data: { question: input.question, options: input.options, createdBy: adminId, createdAt: now } });
  const founders = await prisma.mobileProfile.findMany({ where: { founderNumber: { not: null } }, select: { accountId: true } });
  await Promise.all(founders.map((f) => notify(prisma, f.accountId, "announcements", {
    title: "سؤال للمؤسسين ☕", body: input.question, data: { kind: "founder" },
  }, sender).catch(() => undefined)));
  return (await founderPoll(prisma, adminId, true)) as FounderPollView;
}

/** Admin: stops the open poll; its results stay visible. */
export async function closeFounderPoll(prisma: PrismaClient, adminId: string, now = new Date()): Promise<FounderPollView | null> {
  await prisma.mobileFounderPoll.updateMany({ where: { open: true }, data: { open: false, closedAt: now } });
  return founderPoll(prisma, adminId, true);
}

