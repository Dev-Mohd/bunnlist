import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { avatarUrl } from "./profile";
import { riyadhDay } from "./points";
import { notify, type PushSender, apnsSender } from "./push";

// The admin console's people: find an account, see what it has done, bar it from
// posting for a while (or lift that), make it an admin; and broadcast a push
// notification to everyone, to recent users, or to yourself as a test.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Throws forbidden("suspended") while an admin has barred this account from posting. */
export async function assertCanPost(prisma: PrismaClient, accountId: string, now = new Date()): Promise<void> {
  const s = await prisma.mobileSuspension.findUnique({ where: { accountId }, select: { until: true } });
  if (s && (!s.until || s.until > now)) throw ApiError.forbidden("suspended");
}

export interface AdminUserRow {
  accountId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  isAdmin: boolean;
  suspended: boolean;
}

function isActive(s: { until: Date | null } | undefined, now: Date): boolean {
  return !!s && (!s.until || s.until > now);
}

/** Newest accounts, or those whose username, name or email contains `q`. */
export async function searchUsers(prisma: PrismaClient, q: string, now = new Date()): Promise<AdminUserRow[]> {
  const text = q.trim().replace(/^@/, "");
  const emailMatches = text.length >= 3
    ? await prisma.user.findMany({ where: { email: { contains: text, mode: "insensitive" } }, select: { id: true }, take: 50 })
    : [];
  const profiles = await prisma.mobileProfile.findMany({
    where: text ? {
      OR: [
        { username: { contains: text.toLowerCase() } },
        { displayName: { contains: text, mode: "insensitive" } },
        { accountId: { in: emailMatches.map((u) => u.id) } },
      ],
    } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { accountId: true, username: true, displayName: true, avatarPath: true, createdAt: true },
  });
  const ids = profiles.map((p) => p.accountId);
  const [users, suspensions] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, role: true } }),
    prisma.mobileSuspension.findMany({ where: { accountId: { in: ids } }, select: { accountId: true, until: true } }),
  ]);
  const role = new Map(users.map((u) => [u.id, u.role]));
  const suspension = new Map(suspensions.map((s) => [s.accountId, s]));
  return profiles.map((p) => ({
    accountId: p.accountId, username: p.username, displayName: p.displayName, avatarUrl: avatarUrl(p.avatarPath),
    joinedAt: p.createdAt.toISOString(), isAdmin: role.get(p.accountId) === "ADMIN", suspended: isActive(suspension.get(p.accountId), now),
  }));
}

export interface AdminUser extends AdminUserRow {
  email: string | null;
  bio: string | null;
  points: number;
  lastActiveDay: string | null;
  counts: { reviews: number; recipes: number; brews: number; discoveries: number; followers: number; following: number; reports: number };
  suspension: { reason: string; until: string | null; createdAt: string } | null;
  recentReviews: { lotNameAr: string; rating: number; body: string | null; status: string; createdAt: string }[];
}

export async function adminUser(prisma: PrismaClient, accountId: string, now = new Date()): Promise<AdminUser> {
  const profile = await prisma.mobileProfile.findUnique({ where: { accountId } });
  if (!profile) throw ApiError.unprocessable("user_not_found");
  const [user, points, last, reviews, recipes, brews, discoveries, followers, following, reports, suspension, recent] = await Promise.all([
    prisma.user.findUnique({ where: { id: accountId }, select: { email: true, role: true } }),
    prisma.mobilePointEvent.aggregate({ where: { accountId }, _sum: { points: true } }),
    prisma.mobilePointEvent.findFirst({ where: { accountId, kind: "activity" }, orderBy: { day: "desc" }, select: { day: true } }),
    prisma.review.count({ where: { userId: accountId } }),
    prisma.mobileRecipe.count({ where: { accountId, state: "published" } }),
    prisma.mobileBrewExperience.count({ where: { accountId, state: { not: "deleted" } } }),
    prisma.mobileCoffeeSubmission.count({ where: { accountId, status: "APPROVED" } }),
    prisma.mobileFollow.count({ where: { followeeId: accountId } }),
    prisma.mobileFollow.count({ where: { followerId: accountId } }),
    prisma.mobileReport.count({ where: { targetType: "profile", targetId: accountId } }),
    prisma.mobileSuspension.findUnique({ where: { accountId } }),
    prisma.review.findMany({
      where: { userId: accountId }, orderBy: { createdAt: "desc" }, take: 10,
      select: { rating: true, body: true, status: true, createdAt: true, coffeeLot: { select: { nameAr: true } } },
    }),
  ]);
  return {
    accountId, username: profile.username, displayName: profile.displayName, avatarUrl: avatarUrl(profile.avatarPath),
    joinedAt: profile.createdAt.toISOString(), isAdmin: user?.role === "ADMIN", suspended: isActive(suspension ?? undefined, now),
    email: user?.email ?? null, bio: profile.bio, points: points._sum.points ?? 0, lastActiveDay: last?.day ?? null,
    counts: { reviews, recipes, brews, discoveries, followers, following, reports },
    suspension: suspension && isActive(suspension, now)
      ? { reason: suspension.reason, until: suspension.until?.toISOString() ?? null, createdAt: suspension.createdAt.toISOString() }
      : null,
    recentReviews: recent.map((r) => ({
      lotNameAr: r.coffeeLot.nameAr, rating: r.rating, body: r.body, status: r.status, createdAt: r.createdAt.toISOString(),
    })),
  };
}

export const UserAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(2).max(300), days: z.number().int().min(1).max(3650).nullable() }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("setAdmin"), admin: z.boolean() }),
]);
export type UserAction = z.infer<typeof UserAction>;

export async function applyUserAction(
  prisma: PrismaClient, adminId: string, accountId: string, input: UserAction, now = new Date(),
): Promise<AdminUser> {
  if (accountId === adminId) throw ApiError.unprocessable("not_on_yourself");
  const target = await prisma.user.findUnique({ where: { id: accountId }, select: { role: true } });
  if (!target) throw ApiError.unprocessable("user_not_found");
  switch (input.action) {
    case "suspend": {
      if (target.role === "ADMIN") throw ApiError.unprocessable("cannot_suspend_admin");
      const until = input.days ? new Date(now.getTime() + input.days * DAY_MS) : null;
      await prisma.mobileSuspension.upsert({
        where: { accountId },
        update: { reason: input.reason, until, createdBy: adminId, createdAt: now },
        create: { accountId, reason: input.reason, until, createdBy: adminId, createdAt: now },
      });
      break;
    }
    case "unsuspend":
      await prisma.mobileSuspension.deleteMany({ where: { accountId } });
      break;
    case "setAdmin":
      await prisma.user.update({ where: { id: accountId }, data: { role: input.admin ? "ADMIN" : "USER" } });
      break;
  }
  return adminUser(prisma, accountId, now);
}

// MARK: Broadcasts

export const BROADCAST_AUDIENCES = ["test", "all", "active30"] as const;
export const BroadcastRequest = z.object({
  title: z.string().trim().min(2).max(60),
  body: z.string().trim().min(2).max(200),
  audience: z.enum(BROADCAST_AUDIENCES),
});
export type BroadcastRequest = z.infer<typeof BroadcastRequest>;

/** Accounts with a phone registered, optionally only those active in the last 30 days. */
async function audienceIds(prisma: PrismaClient, audience: "all" | "active30", now: Date): Promise<string[]> {
  const devices = await prisma.mobilePushDevice.findMany({ select: { accountId: true }, distinct: ["accountId"] });
  const ids = devices.map((d) => d.accountId);
  if (audience === "all") return ids;
  const since = riyadhDay(new Date(now.getTime() - 30 * DAY_MS));
  const active = await prisma.mobilePointEvent.findMany({
    where: { kind: "activity", day: { gte: since }, accountId: { in: ids } }, select: { accountId: true }, distinct: ["accountId"],
  });
  return active.map((a) => a.accountId);
}

export async function broadcastAudiences(prisma: PrismaClient, now = new Date()): Promise<{ all: number; active30: number }> {
  const [all, active30] = await Promise.all([audienceIds(prisma, "all", now), audienceIds(prisma, "active30", now)]);
  return { all: all.length, active30: active30.length };
}

/** Sends to everyone in the audience who allows announcements; "test" goes to the sender only. */
export async function broadcast(
  prisma: PrismaClient, adminId: string, input: BroadcastRequest, sender: PushSender | null = apnsSender(), now = new Date(),
): Promise<{ accounts: number; delivered: number }> {
  if (!sender) throw ApiError.forbidden("push_not_configured");
  const ids = input.audience === "test" ? [adminId] : await audienceIds(prisma, input.audience, now);
  let delivered = 0;
  for (let i = 0; i < ids.length; i += 10) {
    const sent = await Promise.all(ids.slice(i, i + 10).map((id) =>
      notify(prisma, id, "announcements", { title: input.title, body: input.body }, sender)));
    delivered += sent.reduce((a, b) => a + b, 0);
  }
  await prisma.mobileBroadcast.create({
    data: { title: input.title, body: input.body, audience: input.audience, accounts: ids.length, delivered, createdBy: adminId },
  });
  return { accounts: ids.length, delivered };
}

export async function broadcastHistory(prisma: PrismaClient) {
  const rows = await prisma.mobileBroadcast.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return rows.map((r) => ({
    id: r.id, title: r.title, body: r.body, audience: r.audience, accounts: r.accounts, delivered: r.delivered,
    createdAt: r.createdAt.toISOString(),
  }));
}
