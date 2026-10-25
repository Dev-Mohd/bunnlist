import type { PrismaClient } from "@prisma/client";
import { UNCREDITED_ACCOUNTS } from "./submissions";
import { avatarUrl, displayNames } from "./profile";

// The community side of a published lot: who discovered it (with their public
// note) and how people use it - collectors, brewers and the brew-method split.

export interface LotDiscoverer {
  name: string;
  username: string | null;
  avatarUrl: string | null;
  note: string | null;
}

export interface LotCommunity {
  /** Accounts that have the coffee in their collection. */
  collectors: number;
  /** Accounts that logged a brew of it in the app, plus website reviewers. */
  brewers: number;
  /** Brews per method, most used first. */
  methods: { method: string; count: number }[];
}

export async function lotDiscoverer(prisma: PrismaClient, lotId: string): Promise<LotDiscoverer | null> {
  const submission = await prisma.mobileCoffeeSubmission.findFirst({
    where: { approvedLotId: lotId, status: "APPROVED", accountId: { notIn: UNCREDITED_ACCOUNTS } },
    select: { accountId: true, publicNote: true },
  });
  if (!submission) return null;
  const [names, profile] = await Promise.all([
    displayNames(prisma, [submission.accountId]),
    prisma.mobileProfile.findUnique({
      where: { accountId: submission.accountId }, select: { username: true, avatarPath: true },
    }),
  ]);
  const name = names.get(submission.accountId);
  if (!name) return null;
  return {
    name,
    username: profile?.username ?? null,
    avatarUrl: avatarUrl(profile?.avatarPath ?? null),
    note: submission.publicNote,
  };
}

export async function lotCommunity(prisma: PrismaClient, lotId: string): Promise<LotCommunity> {
  const [collectors, brews, reviews] = await Promise.all([
    prisma.mobileCollectionEntry.count({ where: { lotId, owned: true } }),
    prisma.mobileBrewExperience.findMany({
      where: { lotId, state: { not: "deleted" } }, select: { accountId: true, methodCode: true },
    }),
    prisma.review.findMany({
      where: { coffeeLotId: lotId, status: "PUBLISHED" }, select: { userId: true, brewMethod: true },
    }),
  ]);
  const counts = new Map<string, number>();
  for (const method of [...brews.map((b) => b.methodCode), ...reviews.map((r) => r.brewMethod as string)]) {
    counts.set(method, (counts.get(method) ?? 0) + 1);
  }
  return {
    collectors,
    brewers: new Set(brews.map((b) => b.accountId)).size + new Set(reviews.map((r) => r.userId)).size,
    methods: [...counts].map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count),
  };
}
