import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { award, currentStreak, EXPERIENCE_DAILY_CAP, leaderboard, POINTS, riyadhDay } from "../points";

describe("riyadhDay", () => {
  it("uses Riyadh time (UTC+3)", () => {
    expect(riyadhDay(new Date("2026-10-25T20:59:00Z"))).toBe("2026-10-25");
    expect(riyadhDay(new Date("2026-10-25T21:01:00Z"))).toBe("2026-10-26");
  });
});

describe("currentStreak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(currentStreak(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-26")).toBe(3);
    expect(currentStreak(["2026-10-24", "2026-10-25"], "2026-10-26")).toBe(2); // today not done yet
    expect(currentStreak(["2026-10-22", "2026-10-25"], "2026-10-26")).toBe(1);
    expect(currentStreak(["2026-10-20"], "2026-10-26")).toBe(0);
    expect(currentStreak(["2026-02-28", "2026-03-01"], "2026-03-01")).toBe(2); // month boundary
  });
});

function ledger(existing: { kind: string; refId: string; day: string; points: number }[] = []) {
  const rows = [...existing];
  const m = {
    mobilePointEvent: {
      create: vi.fn().mockImplementation(({ data }: { data: { kind: string; refId: string; day: string; points: number } }) => {
        if (rows.some((r) => r.kind === data.kind && r.refId === data.refId)) throw new Error("unique");
        rows.push(data);
        return data;
      }),
      count: vi.fn().mockImplementation(({ where }: { where: { kind: string; day: string } }) =>
        rows.filter((r) => r.kind === where.kind && r.day === where.day && r.points > 0).length),
      findMany: vi.fn().mockImplementation(() => rows.filter((r) => r.kind === "activity").map((r) => ({ day: r.day }))),
    },
  };
  return { db: m as unknown as PrismaClient, rows };
}

describe("award", () => {
  const now = new Date("2026-10-26T09:00:00Z");

  it("pays once per thing and marks the active day", async () => {
    const { db, rows } = ledger();
    await award(db, "a", "rate", "lot1", now);
    await award(db, "a", "rate", "lot1", now);
    expect(rows.filter((r) => r.kind === "rate")).toHaveLength(1);
    expect(rows.find((r) => r.kind === "rate")?.points).toBe(POINTS.rate);
    expect(rows.filter((r) => r.kind === "activity")).toHaveLength(1);
  });

  it("caps paid brews per day", async () => {
    const { db, rows } = ledger();
    for (let i = 0; i < EXPERIENCE_DAILY_CAP + 2; i++) await award(db, "a", "experience", `e${i}`, now);
    expect(rows.filter((r) => r.kind === "experience" && r.points > 0)).toHaveLength(EXPERIENCE_DAILY_CAP);
  });

  it("adds the bonus on the seventh day in a row", async () => {
    const days = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"];
    const { db, rows } = ledger(days.map((day) => ({ kind: "activity", refId: day, day, points: 0 })));
    await award(db, "a", "collect", "lot9", now);
    expect(rows.find((r) => r.kind === "streak7")?.points).toBe(POINTS.streak7);
  });

  it("ignores deleted accounts", async () => {
    const { db, rows } = ledger();
    await award(db, "deleted", "discovery", "s1", now);
    expect(rows).toHaveLength(0);
  });
});

describe("leaderboard", () => {
  it("ranks by points, shares ranks on ties, hides opted-out accounts and finds me", async () => {
    const m = {
      mobileProfile: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ accountId: "hidden" }])
          .mockResolvedValueOnce([{ accountId: "a", username: "mohd", displayName: "Mohd", avatarPath: null }]),
      },
      mobilePointEvent: {
        groupBy: vi.fn().mockResolvedValue([
          { accountId: "a", _sum: { points: 50 } }, { accountId: "b", _sum: { points: 50 } },
          { accountId: "c", _sum: { points: 10 } }, { accountId: "hidden", _sum: { points: 999 } },
        ]),
      },
      user: { findMany: vi.fn().mockResolvedValue([{ id: "b", name: "Badr" }]) },
    };
    const result = await leaderboard(m as unknown as PrismaClient, "all", "c");
    expect(result.entries.map((e) => [e.rank, e.name, e.points])).toEqual([[1, "Mohd", 50], [1, "Badr", 50], [3, "مستخدم", 10]]);
    expect(result.entries[2].isMe).toBe(true);
    expect(result.me).toEqual({ rank: 3, points: 10 });
  });
});
