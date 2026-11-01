import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createList, deleteList, getList, ListInput, myLists, setListItem, userLists } from "../lists";
import { commentTarget, postOwner } from "../comments";

const list = (over: Record<string, unknown> = {}) => ({
  id: "L", accountId: "me", title: "للضيوف", note: null, emoji: "☕", isPublic: true, updatedAt: new Date("2026-11-01T10:00:00Z"), ...over,
});
const lotRow = (id: string) => ({
  id, slug: id, name: id, nameAr: id, process: "WASHED", processLabel: null, flavorNotes: [], roastLevel: null,
  averageRating: 4, reviewCount: 1, imageUrl: `https://x/${id}.png`, roaster: { nameAr: "ر", name: "r", slug: "r" }, originCountry: null,
});

function fake(over: Record<string, unknown> = {}) {
  const m = {
    mobileList: {
      findMany: vi.fn().mockResolvedValue([list()]),
      findUnique: vi.fn().mockResolvedValue(list()),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve(list(data))),
      update: vi.fn().mockResolvedValue(list()),
      delete: vi.fn(),
    },
    mobileListItem: {
      findMany: vi.fn().mockResolvedValue([{ listId: "L", lotId: "a", note: "حلوة باردة", addedAt: new Date() }, { listId: "L", lotId: "gone", note: null, addedAt: new Date() }]),
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    coffeeLot: {
      findMany: vi.fn().mockImplementation(({ select }) => Promise.resolve(select?.slug ? [lotRow("a")] : [{ id: "a", imageUrl: "https://x/a.png" }])),
      findUnique: vi.fn().mockResolvedValue({ id: "a" }),
      findFirst: vi.fn().mockResolvedValue({ id: "a" }),
    },
    mobileProfile: {
      findUnique: vi.fn().mockResolvedValue({ accountId: "me", username: "mohd", avatarPath: null, activityVisibility: "everyone", isPrivate: false }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    mobileFollow: { findUnique: vi.fn().mockResolvedValue(null) },
    user: { findMany: vi.fn().mockResolvedValue([{ id: "me", name: "Mohd" }]) },
    $transaction: vi.fn(),
    ...over,
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("lists", () => {
  it("validates input", () => {
    expect(ListInput.safeParse({ title: "" }).success).toBe(false);
    expect(ListInput.safeParse({ title: "قهاوي الصيف", emoji: "☀️" }).success).toBe(true);
  });

  it("lists mine with counts, covers and whether a coffee is in each", async () => {
    const { db } = fake();
    const { lists } = await myLists(db, "me", "a");
    expect(lists[0]).toMatchObject({ id: "L", count: 1, covers: ["https://x/a.png"], hasLot: true });
  });

  it("caps how many lists one has", async () => {
    const { db, m } = fake();
    m.mobileList.count.mockResolvedValue(30);
    await expect(createList(db, "me", { title: "x" })).rejects.toMatchObject({ reason: "too_many_lists" });
    m.mobileList.count.mockResolvedValue(0);
    expect((await createList(db, "me", { title: "x", note: "  " })).note).toBeNull();
  });

  it("only the owner changes a list", async () => {
    const { db, m } = fake();
    m.mobileList.findUnique.mockResolvedValue(list({ accountId: "other" }));
    await expect(setListItem(db, "me", "L", "a", true)).rejects.toMatchObject({ code: "forbidden" });
    await expect(deleteList(db, "me", "L")).rejects.toMatchObject({ code: "forbidden" });
  });

  it("adds with a note and removes", async () => {
    const { db, m } = fake();
    await setListItem(db, "me", "L", "a", true, "للضيوف");
    expect(m.mobileListItem.upsert.mock.calls[0][0].create).toEqual({ listId: "L", lotId: "a", note: "للضيوف" });
    await setListItem(db, "me", "L", "a", false);
    expect(m.mobileListItem.deleteMany).toHaveBeenCalledWith({ where: { listId: "L", lotId: "a" } });
    expect(m.mobileList.update).toHaveBeenCalled();
  });

  it("shows a public list to others, hides a private one", async () => {
    const { db, m } = fake();
    const page = await getList(db, "L", "someone");
    expect(page.isMine).toBe(false);
    expect(page.lots.map((l) => [l.slug, l.itemNote])).toEqual([["a", "حلوة باردة"]]);
    expect(page.owner.username).toBe("mohd");
    m.mobileList.findUnique.mockResolvedValue(list({ isPublic: false }));
    await expect(getList(db, "L", "someone")).rejects.toMatchObject({ reason: "list_not_found" });
    expect((await getList(db, "L", "me")).isMine).toBe(true);
  });

  it("follows the owner's activity privacy", async () => {
    const { db, m } = fake();
    m.mobileProfile.findUnique.mockResolvedValue({ accountId: "me", username: "mohd", activityVisibility: "everyone", isPrivate: true });
    await expect(getList(db, "L", "someone")).rejects.toMatchObject({ reason: "list_not_found" });
    m.mobileFollow.findUnique.mockResolvedValue({ followerId: "someone" });
    expect((await getList(db, "L", "someone")).lots).toHaveLength(1);
  });

  it("a person's public lists skip empty ones for others", async () => {
    const { db, m } = fake();
    m.mobileList.findMany.mockResolvedValue([list(), list({ id: "E" })]);
    const others = await userLists(db, "someone", "mohd");
    expect(m.mobileList.findMany.mock.calls[0][0].where).toEqual({ accountId: "me", isPublic: true });
    expect(others.lists.map((l) => l.id)).toEqual(["L"]);
    const mine = await userLists(db, "me", "mohd");
    expect(mine.lists).toHaveLength(2);
  });
});

describe("comments on reviews", () => {
  it("accepts review as a target and finds its author", async () => {
    expect(commentTarget("review")).toBe("review");
    const db = {
      review: { findFirst: vi.fn().mockResolvedValue({ userId: "u", coffeeLot: { nameAr: "قوجي" } }) },
      mobileProfile: { findUnique: vi.fn().mockResolvedValue({ activityVisibility: "everyone", isPrivate: false }) },
      mobileFollow: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;
    expect(await postOwner(db, "review", "r1", "v")).toEqual({ ownerId: "u", title: "قوجي" });
    (db.mobileProfile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ activityVisibility: "me", isPrivate: false });
    expect(await postOwner(db, "review", "r1", "v")).toBeNull();
  });
});
