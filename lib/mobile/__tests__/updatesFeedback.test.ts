import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createUpdate, deleteUpdate, listUpdates } from "../updates";
import { feedbackInbox, replyFeedback, sendFeedback, FEEDBACK_PER_DAY } from "../feedback";
import { addComment, listComments } from "../comments";

const db = (m: object) => m as unknown as PrismaClient;

describe("updates", () => {
  it("lists live updates as «BunnList» with comment counts", async () => {
    const m = {
      mobileUpdate: { findMany: vi.fn().mockResolvedValue([{ id: "u1", title: "قهوة جديدة", body: "وصلت", createdAt: new Date(), createdBy: "admin" }]) },
      mobileComment: { groupBy: vi.fn().mockResolvedValue([{ targetType: "update", targetId: "u1", _count: { _all: 3 } }]) },
    };
    const [u] = await listUpdates(db(m));
    expect(u).toMatchObject({ id: "u1", author: "BunnList", commentCount: 3 });
    expect(m.mobileUpdate.findMany.mock.calls[0][0].where).toEqual({ deletedAt: null });
  });

  it("posts without a push unless asked", async () => {
    const m = { mobileUpdate: { create: vi.fn().mockResolvedValue({ id: "u1", title: "t1", body: "b1", createdAt: new Date() }) } };
    const out = await createUpdate(db(m), "admin", { title: "t1", body: "b1", notify: false }, null);
    expect(out.delivered).toBe(0);
    expect(m.mobileUpdate.create).toHaveBeenCalledWith({ data: { title: "t1", body: "b1", createdBy: "admin" } });
  });

  it("soft-deletes and reports a missing one", async () => {
    const m = { mobileUpdate: { updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 }) } };
    await expect(deleteUpdate(db(m), "u1")).resolves.toEqual({ ok: true });
    await expect(deleteUpdate(db(m), "u1")).rejects.toMatchObject({ reason: "update_not_found" });
  });
});

describe("comments on updates", () => {
  function fake() {
    return {
      mobileUpdate: { findFirst: vi.fn().mockResolvedValue({ createdBy: "admin", title: "قهوة جديدة" }) },
      mobileProfile: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue({ activityVisibility: "me", isPrivate: true, username: "devmohd", avatarPath: null }) },
      mobileComment: {
        findMany: vi.fn().mockResolvedValue([
          { id: "c1", accountId: "u2", body: "حلو", createdAt: new Date() },
          { id: "c2", accountId: "admin", body: "شكرًا لك", createdAt: new Date() },
        ]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(({ data }) => ({ id: "c3", body: data.body, createdAt: new Date() })),
      },
      mobileSuspension: { findUnique: vi.fn().mockResolvedValue(null) },
      mobileFollow: { findUnique: vi.fn().mockResolvedValue(null) },
      user: {
        findMany: vi.fn().mockImplementation(({ where }) => (where?.role ? [{ id: "admin" }] : [])),
        findUnique: vi.fn().mockImplementation(({ where }) => ({ role: where.id === "admin" ? "ADMIN" : "USER" })),
      },
    };
  }

  it("lets anyone read the thread even though the team's account is hidden, and shows the team as «BunnList»", async () => {
    const { comments } = await listComments(db(fake()), "update", "u1", null);
    expect(comments.map((c) => [c.name, c.isOfficial, c.username])).toEqual([["مستخدم", false, null], ["BunnList", true, null]]);
  });

  it("lets a signed-in user comment under an update", async () => {
    const c = await addComment(db(fake()), "u2", "update", "u1", "متى توصل؟");
    expect(c).toMatchObject({ body: "متى توصل؟", isOfficial: false });
  });
});

describe("feedback", () => {
  it("caps messages per day", async () => {
    const m = { mobileFeedback: { count: vi.fn().mockResolvedValue(FEEDBACK_PER_DAY), create: vi.fn() } };
    await expect(sendFeedback(db(m), "u2", { kind: "suggestion", body: "أضيفوا محمصة" })).rejects.toMatchObject({ code: "rateLimited" });
    expect(m.mobileFeedback.create).not.toHaveBeenCalled();
  });

  it("shows the inbox with senders and marks it read", async () => {
    const m = {
      mobileFeedback: {
        findMany: vi.fn().mockResolvedValue([{ id: "f1", accountId: "u2", kind: "experience", body: "التطبيق حلو", createdAt: new Date(), readAt: null, reply: null, repliedAt: null }]),
        count: vi.fn().mockResolvedValue(1),
        updateMany: vi.fn(),
      },
      mobileProfile: { findMany: vi.fn().mockResolvedValue([{ accountId: "u2", username: "sara", avatarPath: null, displayName: "سارة" }]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const inbox = await feedbackInbox(db(m), "open");
    expect(inbox.open).toBe(1);
    expect(inbox.items[0]).toMatchObject({ username: "sara", isRead: false, kind: "experience" });
    expect(m.mobileFeedback.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["f1"] } }, data: { readAt: expect.any(Date) } });
  });

  it("saves the reply", async () => {
    const m = {
      mobileFeedback: {
        findUnique: vi.fn().mockResolvedValue({ id: "f1", accountId: "u2", readAt: null }),
        update: vi.fn().mockImplementation(({ data }) => ({ id: "f1", kind: "suggestion", body: "x", createdAt: new Date(), ...data })),
      },
    };
    const out = await replyFeedback(db(m), "admin", "f1", "تم، شكرًا!", null);
    expect(out.reply).toBe("تم، شكرًا!");
  });
});
