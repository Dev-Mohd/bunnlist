import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { isDue, nextItem, runRotation } from "../broadcastRotation";

const items = [
  { id: "a", position: 0, title: "أولى", body: "نص أول", enabled: true, sentCount: 0, lastSentAt: null },
  { id: "b", position: 1, title: "ثانية", body: "نص ثاني", enabled: false, sentCount: 0, lastSentAt: null },
  { id: "c", position: 2, title: "ثالثة", body: "نص ثالث", enabled: true, sentCount: 0, lastSentAt: null },
];

describe("broadcast rotation", () => {
  it("takes the next enabled message in order and wraps round", () => {
    expect(nextItem(items, null)?.id).toBe("a");
    expect(nextItem(items, "a")?.id).toBe("c");
    expect(nextItem(items, "c")?.id).toBe("a");
    expect(nextItem(items, "gone")?.id).toBe("a");
    expect(nextItem(items.map((i) => ({ ...i, enabled: false })), null)).toBeNull();
  });

  it("is due every N days, allowing for the cron's drift", () => {
    const now = new Date("2026-11-10T15:10:00Z");
    expect(isDue(null, 2, now)).toBe(true);
    expect(isDue(new Date("2026-11-08T15:40:00Z"), 2, now)).toBe(true);
    expect(isDue(new Date("2026-11-09T15:00:00Z"), 2, now)).toBe(false);
  });

  function db(config: unknown) {
    return {
      mobileBroadcastRotation: { findUnique: vi.fn().mockResolvedValue(config), update: vi.fn() },
      mobileBroadcastRotationItem: { findMany: vi.fn().mockResolvedValue(items), update: vi.fn() },
      mobilePushDevice: { findMany: vi.fn().mockResolvedValue([]) },
      mobileBroadcast: { create: vi.fn() },
    };
  }
  const sender = vi.fn();

  it("does nothing while off or not due", async () => {
    const now = new Date("2026-11-10T15:00:00Z");
    expect(await runRotation(db(null) as unknown as PrismaClient, sender, now)).toEqual({ sent: false, reason: "off" });
    const recent = db({ enabled: true, everyDays: 2, audience: "all", lastRunAt: new Date("2026-11-10T03:00:00Z"), lastItemId: "a" });
    expect(await runRotation(recent as unknown as PrismaClient, sender, now)).toEqual({ sent: false, reason: "not_due" });
    expect(recent.mobileBroadcast.create).not.toHaveBeenCalled();
  });

  it("sends the next message, logs it, and remembers where it is", async () => {
    const now = new Date("2026-11-10T15:00:00Z");
    const m = db({ enabled: true, everyDays: 2, audience: "all", lastRunAt: new Date("2026-11-08T15:00:00Z"), lastItemId: "a" });
    const out = await runRotation(m as unknown as PrismaClient, sender, now);
    expect(out).toMatchObject({ sent: true, title: "ثالثة" });
    expect(m.mobileBroadcastRotation.update.mock.calls[0][0].data).toEqual({ lastRunAt: now, lastItemId: "c" });
    expect(m.mobileBroadcast.create.mock.calls[0][0].data).toMatchObject({ title: "ثالثة", audience: "all", createdBy: "rotation" });
    expect(m.mobileBroadcastRotationItem.update.mock.calls[0][0].where).toEqual({ id: "c" });
  });
});
