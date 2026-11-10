import type { PrismaClient } from "@prisma/client";
import { riyadhDay } from "./mobile/points";

// bunnlist.com/get: every download button on the site points here. It sends the visitor
// to the right place for their phone and counts the tap (day, button, platform), so we can
// see which buttons work. Nothing about the visitor is stored.

export type ClickPlatform = "ios" | "android" | "apk" | "desktop";

/** The visitor's platform from the User-Agent; anything that isn't a phone or tablet is "desktop". */
export function platformOf(userAgent: string | null | undefined): "ios" | "android" | "desktop" {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Crawlers and link previews follow the link too; they aren't people tapping. */
export function isBot(userAgent: string | null | undefined): boolean {
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|monitor|curl|wget|python|node-fetch/i
    .test(userAgent ?? "");
}

/** A short, safe label for the button that was tapped. */
export function cleanSource(input: string | null | undefined): string {
  const text = (input ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
  return text || "direct";
}

/** Adds one to today's count. Never throws: counting must not get in the way of the download. */
export async function recordClick(prisma: PrismaClient, source: string, platform: ClickPlatform, now = new Date()): Promise<void> {
  try {
    const day = riyadhDay(now);
    await prisma.siteClick.upsert({
      where: { day_source_platform: { day, source, platform } },
      update: { count: { increment: 1 } },
      create: { day, source, platform, count: 1 },
    });
  } catch (error) {
    console.error("site click not counted", error);
  }
}

export interface ClickSummary {
  days: number;
  total: number;
  byPlatform: Record<string, number>;
  bySource: Record<string, number>;
  byDay: { day: string; count: number }[];
}

/** Taps over the last `days` days (Riyadh), by platform, by button and by day. */
export async function clickSummary(prisma: PrismaClient, days = 30, now = new Date()): Promise<ClickSummary> {
  const since = riyadhDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  const rows = await prisma.siteClick.findMany({ where: { day: { gte: since } }, orderBy: { day: "asc" } });
  const byPlatform: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const perDay = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    total += r.count;
    byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + r.count;
    bySource[r.source] = (bySource[r.source] ?? 0) + r.count;
    perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.count);
  }
  return { days, total, byPlatform, bySource, byDay: [...perDay].map(([day, count]) => ({ day, count })) };
}
