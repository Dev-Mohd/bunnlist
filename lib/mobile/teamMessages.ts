import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { notify, type PushSender, pushSender } from "./push";

// «رسائل BunnList»: the team writes to one person (one way; they can't reply here, the
// feedback box stays for that). Always signed «فريق BunnList», never the admin's name.
// The app suggests a message after a points reset or a suspension; the admin edits and sends.

export const TEAM_MESSAGE_KINDS = ["general", "warning", "pointsReset", "suspension", "good"] as const;
export type TeamMessageKind = (typeof TEAM_MESSAGE_KINDS)[number];

export const TeamMessageRequest = z.object({
  kind: z.enum(TEAM_MESSAGE_KINDS).default("general"),
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().min(3).max(2000),
});

export interface TeamMessage {
  id: string;
  kind: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

type Row = { id: string; kind: string; title: string; body: string; createdAt: Date; readAt: Date | null };
const view = (r: Row): TeamMessage => ({
  id: r.id, kind: r.kind, title: r.title, body: r.body, createdAt: r.createdAt.toISOString(), read: r.readAt !== null,
});

/** Your messages from the team, newest first, with how many are unread. */
export async function myTeamMessages(prisma: PrismaClient, accountId: string): Promise<{ messages: TeamMessage[]; unread: number }> {
  const rows = await prisma.mobileTeamMessage.findMany({
    where: { accountId }, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, kind: true, title: true, body: true, createdAt: true, readAt: true },
  });
  return { messages: rows.map(view), unread: rows.filter((r) => r.readAt === null).length };
}

/** Marks all of them read (opening the screen). */
export async function markTeamMessagesRead(prisma: PrismaClient, accountId: string, now = new Date()): Promise<{ ok: true }> {
  await prisma.mobileTeamMessage.updateMany({ where: { accountId, readAt: null }, data: { readAt: now } });
  return { ok: true };
}

/** An admin writes to someone; they get a push «رسالة من فريق BunnList». */
export async function sendTeamMessage(
  prisma: PrismaClient, adminId: string, accountId: string, input: z.infer<typeof TeamMessageRequest>,
  sender: PushSender | null = pushSender(),
): Promise<TeamMessage> {
  const exists = await prisma.mobileProfile.findUnique({ where: { accountId }, select: { accountId: true } });
  if (!exists) throw ApiError.unprocessable("user_not_found");
  const row = await prisma.mobileTeamMessage.create({
    data: { accountId, kind: input.kind, title: input.title, body: input.body, createdBy: adminId },
    select: { id: true, kind: true, title: true, body: true, createdAt: true, readAt: true },
  });
  // Messages from the team ride the «إعلانات» setting, like broadcasts.
  await notify(prisma, accountId, "announcements", {
    title: "رسالة من فريق BunnList", body: input.title, data: { teamMessages: "1" },
  }, sender);
  return view(row);
}

/** What the team sent this person (for the admin's user page). */
export async function teamMessagesFor(prisma: PrismaClient, accountId: string): Promise<TeamMessage[]> {
  const rows = await prisma.mobileTeamMessage.findMany({
    where: { accountId }, orderBy: { createdAt: "desc" }, take: 30,
    select: { id: true, kind: true, title: true, body: true, createdAt: true, readAt: true },
  });
  return rows.map(view);
}
