import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { avatarUrl, displayNames } from "./profile";
import { notify, type PushSender } from "./push";

// Suggestions, experiences and problems users send the team, and the team's reply.
// A user sees only their own messages; admins see all of them and can answer, which
// notifies the sender.

export const FEEDBACK_KINDS = ["suggestion", "experience", "problem"] as const;
export const FEEDBACK_PER_DAY = 10;
const DAY = 24 * 60 * 60 * 1000;

export const FeedbackRequest = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  body: z.string().trim().min(3).max(2000),
});
export const FeedbackReply = z.object({ reply: z.string().trim().min(1).max(2000) });

export interface MyFeedback {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
}

export interface InboxFeedback extends MyFeedback {
  name: string;
  username: string | null;
  avatarUrl: string | null;
  isRead: boolean;
}

type Row = { id: string; kind: string; body: string; createdAt: Date; reply: string | null; repliedAt: Date | null };
const mine = (r: Row): MyFeedback => ({
  id: r.id, kind: r.kind, body: r.body, createdAt: r.createdAt.toISOString(),
  reply: r.reply, repliedAt: r.repliedAt?.toISOString() ?? null,
});

export async function sendFeedback(
  prisma: PrismaClient, accountId: string, input: z.infer<typeof FeedbackRequest>, now = new Date(),
): Promise<MyFeedback> {
  const recent = await prisma.mobileFeedback.count({ where: { accountId, createdAt: { gte: new Date(now.getTime() - DAY) } } });
  if (recent >= FEEDBACK_PER_DAY) throw ApiError.rateLimited("too_much_feedback");
  const row = await prisma.mobileFeedback.create({ data: { accountId, kind: input.kind, body: input.body } });
  return mine(row);
}

export async function myFeedback(prisma: PrismaClient, accountId: string): Promise<MyFeedback[]> {
  const rows = await prisma.mobileFeedback.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 50 });
  return rows.map(mine);
}

/** The team's inbox, newest first; `open` keeps only messages not answered yet. */
export async function feedbackInbox(prisma: PrismaClient, filter: "open" | "all" = "open"): Promise<{ items: InboxFeedback[]; open: number }> {
  const [rows, open] = await Promise.all([
    prisma.mobileFeedback.findMany({ where: filter === "open" ? { reply: null } : {}, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.mobileFeedback.count({ where: { reply: null } }),
  ]);
  const ids = [...new Set(rows.map((r) => r.accountId))];
  const [names, profiles] = await Promise.all([
    displayNames(prisma, ids),
    prisma.mobileProfile.findMany({ where: { accountId: { in: ids } }, select: { accountId: true, username: true, avatarPath: true } }),
  ]);
  const profile = new Map(profiles.map((p) => [p.accountId, p]));
  const unread = rows.filter((r) => !r.readAt).map((r) => r.id);
  if (unread.length) await prisma.mobileFeedback.updateMany({ where: { id: { in: unread } }, data: { readAt: new Date() } });
  return {
    open,
    items: rows.map((r) => ({
      ...mine(r), name: names.get(r.accountId) ?? "مستخدم", username: profile.get(r.accountId)?.username ?? null,
      avatarUrl: avatarUrl(profile.get(r.accountId)?.avatarPath ?? null), isRead: !!r.readAt,
    })),
  };
}

export async function replyFeedback(
  prisma: PrismaClient, adminId: string, id: string, reply: string, sender?: PushSender | null,
): Promise<MyFeedback> {
  const existing = await prisma.mobileFeedback.findUnique({ where: { id } });
  if (!existing) throw ApiError.unprocessable("feedback_not_found");
  const row = await prisma.mobileFeedback.update({
    where: { id }, data: { reply, repliedAt: new Date(), repliedBy: adminId, readAt: existing.readAt ?? new Date() },
  });
  await notify(prisma, existing.accountId, "announcements", {
    title: "رد فريق BunnList", body: reply.length > 150 ? `${reply.slice(0, 147)}…` : reply, data: { link: "feedback" },
  }, sender).catch(() => 0);
  return mine(row);
}
