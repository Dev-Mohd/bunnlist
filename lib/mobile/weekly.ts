import type { PrismaClient } from "@prisma/client";
import { notify, type PushSender, apnsSender } from "./push";
import { currentStreak, riyadhDay } from "./points";

// "ملخصك الأسبوعي": every Friday afternoon (Vercel cron), people with a phone
// registered who earned points in the last 7 days get their week in one line.

export function weeklyLine(points: number, actions: number, streak: number): string {
  const parts = [`جمعت ${points} نقطة من ${actions} نشاط`];
  if (streak >= 2) parts.push(`وسلسلتك ${streak} أيام 🔥`);
  return parts.join(" ") + ". كمّل!";
}

export async function sendWeeklySummaries(
  prisma: PrismaClient, now = new Date(), sender: PushSender | null = apnsSender(),
): Promise<{ accounts: number; sent: number }> {
  if (!sender) return { accounts: 0, sent: 0 };
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const devices = await prisma.mobilePushDevice.findMany({ select: { accountId: true }, distinct: ["accountId"] });
  let accounts = 0;
  let sent = 0;
  for (const { accountId } of devices) {
    const [week, days] = await Promise.all([
      prisma.mobilePointEvent.aggregate({
        where: { accountId, createdAt: { gte: since }, points: { gt: 0 } }, _sum: { points: true }, _count: { _all: true },
      }),
      prisma.mobilePointEvent.findMany({ where: { accountId, kind: "activity" }, select: { day: true }, orderBy: { day: "desc" }, take: 60 }),
    ]);
    const points = week._sum.points ?? 0;
    if (points <= 0) continue;
    accounts += 1;
    sent += await notify(prisma, accountId, "weeklySummary", {
      title: "ملخصك الأسبوعي ☕",
      body: weeklyLine(points, week._count._all, currentStreak(days.map((d) => d.day), riyadhDay(now))),
    }, sender);
  }
  return { accounts, sent };
}
