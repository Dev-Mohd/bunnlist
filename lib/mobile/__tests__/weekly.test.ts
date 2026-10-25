import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { sendWeeklySummaries, weeklyLine } from "../weekly";

describe("weekly summary", () => {
  it("writes the line", () => {
    expect(weeklyLine(45, 6, 4)).toBe("جمعت 45 نقطة من 6 نشاط وسلسلتك 4 أيام 🔥. كمّل!");
    expect(weeklyLine(10, 1, 1)).toBe("جمعت 10 نقطة من 1 نشاط. كمّل!");
  });

  it("notifies only people who earned points this week", async () => {
    const m = {
      mobilePushDevice: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ accountId: "a" }, { accountId: "b" }])
          .mockResolvedValue([{ token: "aa", environment: "sandbox" }]),
        deleteMany: vi.fn(),
      },
      mobilePointEvent: {
        aggregate: vi.fn()
          .mockResolvedValueOnce({ _sum: { points: 30 }, _count: { _all: 3 } })
          .mockResolvedValueOnce({ _sum: { points: null }, _count: { _all: 0 } }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      mobileNotificationSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const sender = vi.fn().mockResolvedValue({ status: 200 });
    const result = await sendWeeklySummaries(m as unknown as PrismaClient, new Date("2026-10-30T14:00:00Z"), sender);
    expect(result).toEqual({ accounts: 1, sent: 1 });
    expect(sender.mock.calls[0][1].title).toBe("ملخصك الأسبوعي ☕");
    expect(await sendWeeklySummaries(m as unknown as PrismaClient, new Date(), null)).toEqual({ accounts: 0, sent: 0 });
  });
});
