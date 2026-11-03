import type { PrismaClient } from "@prisma/client";
import { staffIds } from "./admin";
import { ApiError } from "./errors";
import { accountIdFor, peopleRows, type PersonRow } from "./social";

// Blocking: the blocker and the blocked stop seeing each other's activity, posts and
// comments, follows between them end, and neither can follow or comment on the other.
// The team's accounts can't be blocked, so moderation keeps working.

export async function block(prisma: PrismaClient, viewerId: string, username: string): Promise<{ blocked: true }> {
  const accountId = await accountIdFor(prisma, username);
  if (accountId === viewerId) throw ApiError.unprocessable("cannot_block_self");
  if ((await staffIds(prisma)).includes(accountId)) throw ApiError.unprocessable("user_not_found");
  await prisma.$transaction([
    prisma.mobileBlock.upsert({
      where: { blockerId_blockedId: { blockerId: viewerId, blockedId: accountId } },
      update: {}, create: { blockerId: viewerId, blockedId: accountId },
    }),
    prisma.mobileFollow.deleteMany({ where: { OR: [{ followerId: viewerId, followeeId: accountId }, { followerId: accountId, followeeId: viewerId }] } }),
    prisma.mobileFollowRequest.deleteMany({ where: { OR: [{ requesterId: viewerId, targetId: accountId }, { requesterId: accountId, targetId: viewerId }] } }),
  ]);
  return { blocked: true };
}

export async function unblock(prisma: PrismaClient, viewerId: string, username: string): Promise<{ blocked: false }> {
  const accountId = await accountIdFor(prisma, username);
  await prisma.mobileBlock.deleteMany({ where: { blockerId: viewerId, blockedId: accountId } });
  return { blocked: false };
}

/** People the viewer blocked, newest first. */
export async function myBlocks(prisma: PrismaClient, viewerId: string): Promise<PersonRow[]> {
  const rows = await prisma.mobileBlock.findMany({ where: { blockerId: viewerId }, orderBy: { createdAt: "desc" }, select: { blockedId: true } });
  return peopleRows(prisma, rows.map((r) => r.blockedId));
}
