import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { LOT_LIST_SELECT, mapLot, type CoffeeLotRow, type MobileLot } from "./catalog";
import { ApiError } from "./errors";
import { activityLevel, avatarUrl, displayNames, normalizeUsername } from "./profile";
import { canSee } from "./social";

// «قوائمي»: lists a person names and fills with coffees («قهاوي الصيف», «للضيوف»),
// each with an optional note per coffee. Public lists show on their profile and
// open from a shared link for whoever may see their activity; private ones are
// theirs alone.

export const MAX_LISTS = 30;
export const MAX_ITEMS = 200;

export const ListInput = z.object({
  title: z.string().trim().min(1).max(40),
  note: z.string().trim().max(200).optional().nullable(),
  emoji: z.string().trim().max(8).optional().nullable(),
  isPublic: z.boolean().optional(),
});
export const ListUpdate = ListInput.partial();
export const ItemInput = z.object({ note: z.string().trim().max(140).optional().nullable() });

export interface MobileListSummary {
  id: string;
  title: string;
  note: string | null;
  emoji: string | null;
  isPublic: boolean;
  count: number;
  /** Up to four bag photos, newest additions first. */
  covers: string[];
  updatedAt: string;
  /** With ?lot=: whether that coffee is in it. */
  hasLot?: boolean;
}

export interface MobileListPage {
  list: MobileListSummary;
  owner: { name: string; username: string | null; avatarUrl: string | null };
  isMine: boolean;
  lots: (MobileLot & { itemNote: string | null; addedAt: string })[];
}

type ListRow = { id: string; accountId: string; title: string; note: string | null; emoji: string | null; isPublic: boolean; updatedAt: Date };

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

async function summaries(prisma: PrismaClient, rows: ListRow[], lotId?: string | null): Promise<MobileListSummary[]> {
  if (!rows.length) return [];
  const items = await prisma.mobileListItem.findMany({
    where: { listId: { in: rows.map((r) => r.id) } }, orderBy: { addedAt: "desc" }, select: { listId: true, lotId: true },
  });
  const lots = await prisma.coffeeLot.findMany({
    where: { id: { in: [...new Set(items.map((i) => i.lotId))] }, publishedAt: { not: null } }, select: { id: true, imageUrl: true },
  });
  const image = new Map(lots.map((l) => [l.id, l.imageUrl]));
  return rows.map((r) => {
    const mine = items.filter((i) => i.listId === r.id && image.has(i.lotId));
    return {
      id: r.id, title: r.title, note: r.note, emoji: r.emoji, isPublic: r.isPublic, count: mine.length,
      covers: mine.flatMap((i) => (image.get(i.lotId) ? [image.get(i.lotId)!] : [])).slice(0, 4),
      updatedAt: r.updatedAt.toISOString(),
      ...(lotId !== undefined ? { hasLot: !!lotId && mine.some((i) => i.lotId === lotId) } : {}),
    };
  });
}

async function ownList(prisma: PrismaClient, accountId: string, id: string): Promise<ListRow> {
  const list = await prisma.mobileList.findUnique({ where: { id } });
  if (!list) throw ApiError.unprocessable("list_not_found");
  if (list.accountId !== accountId) throw ApiError.forbidden("not_yours");
  return list;
}

/** The caller's lists, last changed first; with a coffee slug, which ones hold it. */
export async function myLists(prisma: PrismaClient, accountId: string, lotSlug?: string | null): Promise<{ lists: MobileListSummary[] }> {
  const rows = await prisma.mobileList.findMany({ where: { accountId }, orderBy: { updatedAt: "desc" }, take: MAX_LISTS });
  let lotId: string | null | undefined;
  if (lotSlug) lotId = (await prisma.coffeeLot.findUnique({ where: { slug: lotSlug }, select: { id: true } }))?.id ?? null;
  return { lists: await summaries(prisma, rows, lotId) };
}

export async function createList(prisma: PrismaClient, accountId: string, input: z.infer<typeof ListInput>): Promise<MobileListSummary> {
  if ((await prisma.mobileList.count({ where: { accountId } })) >= MAX_LISTS) throw ApiError.unprocessable("too_many_lists");
  const row = await prisma.mobileList.create({
    data: { accountId, title: input.title, note: clean(input.note), emoji: clean(input.emoji), isPublic: input.isPublic ?? true },
  });
  return (await summaries(prisma, [row]))[0];
}

export async function updateList(prisma: PrismaClient, accountId: string, id: string, input: z.infer<typeof ListUpdate>): Promise<MobileListSummary> {
  await ownList(prisma, accountId, id);
  const row = await prisma.mobileList.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.note !== undefined ? { note: clean(input.note) } : {}),
      ...(input.emoji !== undefined ? { emoji: clean(input.emoji) } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
    },
  });
  return (await summaries(prisma, [row]))[0];
}

export async function deleteList(prisma: PrismaClient, accountId: string, id: string): Promise<{ ok: true }> {
  const list = await prisma.mobileList.findUnique({ where: { id }, select: { accountId: true } });
  if (!list) return { ok: true };
  if (list.accountId !== accountId) throw ApiError.forbidden("not_yours");
  await prisma.$transaction([
    prisma.mobileListItem.deleteMany({ where: { listId: id } }),
    prisma.mobileList.delete({ where: { id } }),
  ]);
  return { ok: true };
}

/** Adds (or re-notes) a coffee in a list, or takes it out. */
export async function setListItem(
  prisma: PrismaClient, accountId: string, id: string, slug: string, add: boolean, note?: string | null,
): Promise<MobileListSummary> {
  await ownList(prisma, accountId, id);
  const lot = await prisma.coffeeLot.findFirst({ where: { slug, publishedAt: { not: null } }, select: { id: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  if (add) {
    const exists = await prisma.mobileListItem.findUnique({ where: { listId_lotId: { listId: id, lotId: lot.id } } });
    if (!exists && (await prisma.mobileListItem.count({ where: { listId: id } })) >= MAX_ITEMS) throw ApiError.unprocessable("list_full");
    await prisma.mobileListItem.upsert({
      where: { listId_lotId: { listId: id, lotId: lot.id } },
      update: note !== undefined ? { note: clean(note) } : {},
      create: { listId: id, lotId: lot.id, note: clean(note) },
    });
  } else {
    await prisma.mobileListItem.deleteMany({ where: { listId: id, lotId: lot.id } });
  }
  const row = await prisma.mobileList.update({ where: { id }, data: { updatedAt: new Date() } });
  return (await summaries(prisma, [row]))[0];
}

async function mayView(prisma: PrismaClient, ownerId: string, viewerId: string | null): Promise<boolean> {
  if (viewerId === ownerId) return true;
  const [profile, follows] = await Promise.all([
    prisma.mobileProfile.findUnique({ where: { accountId: ownerId }, select: { activityVisibility: true, isPrivate: true } }),
    viewerId ? prisma.mobileFollow.findUnique({ where: { followerId_followeeId: { followerId: viewerId, followeeId: ownerId } } }) : Promise.resolve(null),
  ]);
  return canSee(activityLevel(profile), false, !!follows);
}

/** One list with its coffees, for its owner, or for anyone allowed when it's public. */
export async function getList(prisma: PrismaClient, id: string, viewerId: string | null): Promise<MobileListPage> {
  const list = await prisma.mobileList.findUnique({ where: { id } });
  const isMine = !!list && list.accountId === viewerId;
  if (!list || (!isMine && (!list.isPublic || !(await mayView(prisma, list.accountId, viewerId))))) {
    throw ApiError.unprocessable("list_not_found");
  }
  const items = await prisma.mobileListItem.findMany({ where: { listId: id }, orderBy: { addedAt: "desc" } });
  const [rows, names, profile, [summary]] = await Promise.all([
    prisma.coffeeLot.findMany({ where: { id: { in: items.map((i) => i.lotId) }, publishedAt: { not: null } }, select: LOT_LIST_SELECT }),
    displayNames(prisma, [list.accountId]),
    prisma.mobileProfile.findUnique({ where: { accountId: list.accountId }, select: { username: true, avatarPath: true } }),
    summaries(prisma, [list]),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return {
    list: summary,
    owner: { name: names.get(list.accountId) ?? "مستخدم", username: profile?.username ?? null, avatarUrl: avatarUrl(profile?.avatarPath ?? null) },
    isMine,
    lots: items.flatMap((i) => {
      const row = byId.get(i.lotId);
      return row ? [{ ...mapLot(row as unknown as CoffeeLotRow), itemNote: i.note, addedAt: i.addedAt.toISOString() }] : [];
    }),
  };
}

/** A person's public lists (all of them for themselves). */
export async function userLists(prisma: PrismaClient, viewerId: string | null, username: string): Promise<{ lists: MobileListSummary[] }> {
  const owner = await prisma.mobileProfile.findUnique({ where: { username: normalizeUsername(username) }, select: { accountId: true } });
  if (!owner) throw ApiError.unprocessable("user_not_found");
  const isMe = owner.accountId === viewerId;
  if (!(await mayView(prisma, owner.accountId, viewerId))) throw new ApiError("forbidden", "hidden_by_owner");
  const rows = await prisma.mobileList.findMany({
    where: { accountId: owner.accountId, ...(isMe ? {} : { isPublic: true }) }, orderBy: { updatedAt: "desc" }, take: MAX_LISTS,
  });
  const lists = await summaries(prisma, rows);
  // Empty lists are drafts to everyone else.
  return { lists: isMe ? lists : lists.filter((l) => l.count > 0) };
}
