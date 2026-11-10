import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { broadcast } from "./adminUsers";
import { type PushSender, pushSender } from "./push";

// Repeating notifications: an admin keeps a short list of messages; every few days
// the daily cron sends the next one in order, then starts over. Off until an admin
// turns it on, and every send lands in the broadcast log like a manual one.

const DAY_MS = 24 * 60 * 60 * 1000;
/** The cron fires once a day but not on the minute: a run this close to due still counts. */
const SLACK_MS = 2 * 60 * 60 * 1000;

export const RotationInput = z.object({
  enabled: z.boolean(),
  everyDays: z.number().int().min(1).max(30),
  audience: z.enum(["all", "active30"]),
  items: z.array(z.object({
    id: z.string().min(1).max(40).optional(),
    title: z.string().trim().min(2).max(60),
    body: z.string().trim().min(2).max(200),
    enabled: z.boolean().default(true),
  })).max(30),
});
export type RotationInput = z.infer<typeof RotationInput>;

export interface RotationItem { id: string; title: string; body: string; enabled: boolean; sentCount: number; lastSentAt: string | null }
export interface Rotation {
  enabled: boolean;
  everyDays: number;
  audience: string;
  lastRunAt: string | null;
  /** When the next message is due, or null while off or empty. */
  nextRunAt: string | null;
  /** The message that goes next, or null. */
  nextItemId: string | null;
  items: RotationItem[];
}

type ItemRow = { id: string; position: number; title: string; body: string; enabled: boolean; sentCount: number; lastSentAt: Date | null };

/** The enabled message after `lastItemId` in order, wrapping round; the first when there is no last. */
export function nextItem<T extends { id: string; enabled: boolean }>(items: T[], lastItemId: string | null): T | null {
  const on = items.filter((i) => i.enabled);
  if (on.length === 0) return null;
  const at = items.findIndex((i) => i.id === lastItemId);
  if (at < 0) return on[0];
  return items.slice(at + 1).find((i) => i.enabled) ?? on[0];
}

/** Due when never run, or `everyDays` have passed (less the cron's slack). */
export function isDue(lastRunAt: Date | null, everyDays: number, now: Date): boolean {
  return !lastRunAt || now.getTime() - lastRunAt.getTime() >= everyDays * DAY_MS - SLACK_MS;
}

export async function getRotation(prisma: PrismaClient): Promise<Rotation> {
  const [config, rows] = await Promise.all([
    prisma.mobileBroadcastRotation.findUnique({ where: { id: "main" } }),
    prisma.mobileBroadcastRotationItem.findMany({ orderBy: { position: "asc" } }),
  ]);
  const items: ItemRow[] = rows;
  const enabled = config?.enabled ?? false;
  const everyDays = config?.everyDays ?? 2;
  const next = nextItem(items, config?.lastItemId ?? null);
  const nextRunAt = enabled && next
    ? (config?.lastRunAt ? new Date(config.lastRunAt.getTime() + everyDays * DAY_MS).toISOString() : new Date().toISOString())
    : null;
  return {
    enabled, everyDays, audience: config?.audience ?? "all",
    lastRunAt: config?.lastRunAt?.toISOString() ?? null, nextRunAt, nextItemId: next?.id ?? null,
    items: items.map((i) => ({
      id: i.id, title: i.title, body: i.body, enabled: i.enabled, sentCount: i.sentCount, lastSentAt: i.lastSentAt?.toISOString() ?? null,
    })),
  };
}

/** Replaces the list (kept messages keep their counts) and the settings. */
export async function saveRotation(prisma: PrismaClient, adminId: string, input: RotationInput): Promise<Rotation> {
  const existing = await prisma.mobileBroadcastRotationItem.findMany({ select: { id: true } });
  const known = new Set(existing.map((e) => e.id));
  const kept = new Set(input.items.map((i) => i.id).filter((id): id is string => !!id && known.has(id)));
  await prisma.$transaction([
    prisma.mobileBroadcastRotationItem.deleteMany({ where: { id: { notIn: [...kept] } } }),
    ...input.items.map((item, position) => item.id && known.has(item.id)
      ? prisma.mobileBroadcastRotationItem.update({ where: { id: item.id }, data: { position, title: item.title, body: item.body, enabled: item.enabled } })
      : prisma.mobileBroadcastRotationItem.create({ data: { position, title: item.title, body: item.body, enabled: item.enabled } })),
    prisma.mobileBroadcastRotation.upsert({
      where: { id: "main" },
      create: { id: "main", enabled: input.enabled, everyDays: input.everyDays, audience: input.audience, updatedBy: adminId },
      update: { enabled: input.enabled, everyDays: input.everyDays, audience: input.audience, updatedBy: adminId },
    }),
  ]);
  return getRotation(prisma);
}

/** The daily cron: sends the next message when the rotation is on and due. */
export async function runRotation(
  prisma: PrismaClient, sender: PushSender | null = pushSender(), now = new Date(),
): Promise<{ sent: boolean; reason?: string; title?: string; accounts?: number; delivered?: number }> {
  const config = await prisma.mobileBroadcastRotation.findUnique({ where: { id: "main" } });
  if (!config?.enabled) return { sent: false, reason: "off" };
  if (!isDue(config.lastRunAt, config.everyDays, now)) return { sent: false, reason: "not_due" };
  if (!sender) return { sent: false, reason: "push_not_configured" };
  const items: ItemRow[] = await prisma.mobileBroadcastRotationItem.findMany({ orderBy: { position: "asc" } });
  const item = nextItem(items, config.lastItemId);
  if (!item) return { sent: false, reason: "empty" };
  // Claimed before sending: a second cron call in the same hour finds it not due.
  await prisma.mobileBroadcastRotation.update({ where: { id: "main" }, data: { lastRunAt: now, lastItemId: item.id } });
  const audience = config.audience === "active30" ? "active30" : "all";
  const result = await broadcast(prisma, "rotation", { title: item.title, body: item.body, audience }, sender, now);
  await prisma.mobileBroadcastRotationItem.update({ where: { id: item.id }, data: { sentCount: { increment: 1 }, lastSentAt: now } });
  return { sent: true, title: item.title, ...result };
}
