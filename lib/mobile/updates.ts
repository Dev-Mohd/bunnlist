import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { commentCounts } from "./comments";
import { ApiError } from "./errors";
import { broadcast } from "./adminUsers";
import { OFFICIAL_NAME } from "./admin";
import type { PushSender } from "./push";

// «تحديثات BunnList»: short posts from the team (new coffees, new features, news).
// Everyone can read them; signed-in people comment under them through the comments
// API (target "update"). Posting can also push a notification to everyone.

export const UpdateRequest = z.object({
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().min(2).max(2000),
  notify: z.boolean().default(false),
});
export type UpdateRequest = z.infer<typeof UpdateRequest>;

export interface MobileUpdate {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  commentCount: number;
}

export async function listUpdates(prisma: PrismaClient, limit = 30): Promise<MobileUpdate[]> {
  const rows = await prisma.mobileUpdate.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: limit });
  const counts = await commentCounts(prisma, rows.map((r) => ({ type: "update" as const, id: r.id })));
  return rows.map((r) => ({
    id: r.id, title: r.title, body: r.body, author: OFFICIAL_NAME, createdAt: r.createdAt.toISOString(),
    commentCount: counts.get(`update|${r.id}`) ?? 0,
  }));
}

/** Posts an update (admins only, checked by the route) and, if asked, tells everyone. */
export async function createUpdate(
  prisma: PrismaClient, adminId: string, input: UpdateRequest, sender?: PushSender | null,
): Promise<{ update: MobileUpdate; delivered: number }> {
  const row = await prisma.mobileUpdate.create({ data: { title: input.title, body: input.body, createdBy: adminId } });
  let delivered = 0;
  if (input.notify) {
    const body = input.body.length > 180 ? `${input.body.slice(0, 177)}…` : input.body;
    delivered = (await broadcast(prisma, adminId, { title: input.title.slice(0, 60), body, audience: "all" }, sender).catch(() => ({ delivered: 0 }))).delivered;
  }
  return {
    update: { id: row.id, title: row.title, body: row.body, author: OFFICIAL_NAME, createdAt: row.createdAt.toISOString(), commentCount: 0 },
    delivered,
  };
}

export async function deleteUpdate(prisma: PrismaClient, id: string): Promise<{ ok: true }> {
  const { count } = await prisma.mobileUpdate.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
  if (!count) throw ApiError.unprocessable("update_not_found");
  return { ok: true };
}
