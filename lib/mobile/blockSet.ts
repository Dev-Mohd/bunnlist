import type { PrismaClient } from "@prisma/client";

/** Accounts the viewer blocked or was blocked by; hidden from each other everywhere. */
export async function blockedWith(prisma: PrismaClient, viewerId: string | null): Promise<Set<string>> {
  if (!viewerId) return new Set();
  const rows = await prisma.mobileBlock.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] }, select: { blockerId: true, blockedId: true },
  });
  return new Set(rows.map((r) => (r.blockerId === viewerId ? r.blockedId : r.blockerId)));
}
