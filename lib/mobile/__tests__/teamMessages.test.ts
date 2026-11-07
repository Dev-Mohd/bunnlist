import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { markTeamMessagesRead, myTeamMessages, sendTeamMessage, TeamMessageRequest } from "../teamMessages";

function fake() {
  const rows: { id: string; accountId: string; kind: string; title: string; body: string; createdBy: string; createdAt: Date; readAt: Date | null }[] = [];
  const m = {
    mobileProfile: { findUnique: vi.fn().mockImplementation(({ where }: { where: { accountId: string } }) => (where.accountId === "u1" ? { accountId: "u1" } : null)) },
    mobileTeamMessage: {
      create: vi.fn().mockImplementation(({ data }: { data: Omit<(typeof rows)[number], "id" | "createdAt" | "readAt"> }) => {
        const row = { id: `m${rows.length + 1}`, createdAt: new Date(Date.UTC(2026, 10, 7, rows.length)), readAt: null, ...data };
        rows.push(row);
        return row;
      }),
      findMany: vi.fn().mockImplementation(({ where }: { where: { accountId: string } }) =>
        rows.filter((r) => r.accountId === where.accountId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
      updateMany: vi.fn().mockImplementation(({ where, data }: { where: { accountId: string }; data: { readAt: Date } }) => {
        rows.filter((r) => r.accountId === where.accountId && r.readAt === null).forEach((r) => { r.readAt = data.readAt; });
        return { count: 1 };
      }),
    },
    mobileNotificationSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    mobilePushDevice: { findMany: vi.fn().mockResolvedValue([{ token: "t", environment: "production" }]), deleteMany: vi.fn() },
  };
  return { db: m as unknown as PrismaClient, rows };
}

describe("team messages", () => {
  it("sends signed by the team, pushes, and keeps the admin only on the row", async () => {
    const { db, rows } = fake();
    const sender = vi.fn().mockResolvedValue({ status: 200 });
    const msg = await sendTeamMessage(db, "admin", "u1", TeamMessageRequest.parse({ kind: "pointsReset", title: "صفّرنا نقاطك", body: "لاحظنا إضافات كثيرة بدون تجربة." }), sender);
    expect(msg).toMatchObject({ kind: "pointsReset", title: "صفّرنا نقاطك", read: false });
    expect(msg).not.toHaveProperty("createdBy");
    expect(rows[0].createdBy).toBe("admin");
    expect(sender.mock.calls[0][1]).toMatchObject({ title: "رسالة من فريق BunnList", body: "صفّرنا نقاطك", data: { kind: "announcements", teamMessages: "1" } });
  });

  it("lists newest first with an unread count, and marks read", async () => {
    const { db } = fake();
    await sendTeamMessage(db, "admin", "u1", { kind: "general", title: "أهلًا", body: "مرحبا بك في BunnList" }, null);
    await sendTeamMessage(db, "admin", "u1", { kind: "good", title: "انقبل اقتراحك", body: "شكرًا لك" }, null);
    const before = await myTeamMessages(db, "u1");
    expect(before.unread).toBe(2);
    expect(before.messages[0].title).toBe("انقبل اقتراحك");
    await markTeamMessagesRead(db, "u1");
    expect((await myTeamMessages(db, "u1")).unread).toBe(0);
  });

  it("refuses unknown accounts and bad input", async () => {
    const { db } = fake();
    await expect(sendTeamMessage(db, "admin", "nobody", { kind: "general", title: "تجربة", body: "نص" }, null)).rejects.toMatchObject({ code: "unprocessable" });
    expect(TeamMessageRequest.safeParse({ title: "x", body: "قصير جدًا" }).success).toBe(false);
  });
});
