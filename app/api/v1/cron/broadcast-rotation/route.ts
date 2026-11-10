import { prisma } from "@/lib/prisma";
import { runRotation } from "@/lib/mobile/broadcastRotation";

// GET /api/v1/cron/broadcast-rotation — run by Vercel Cron daily (vercel.json,
// 15:00 UTC = 6 pm Riyadh). Sends the next repeating notification when it's on and
// due. Vercel sends "Authorization: Bearer $CRON_SECRET"; without CRON_SECRET
// configured the route refuses everyone.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await runRotation(prisma));
}
