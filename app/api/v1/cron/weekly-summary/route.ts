import { prisma } from "@/lib/prisma";
import { sendWeeklySummaries } from "@/lib/mobile/weekly";

// GET /api/v1/cron/weekly-summary — run by Vercel Cron (vercel.json, Fridays
// 14:00 UTC = 5 pm Riyadh). Vercel sends "Authorization: Bearer $CRON_SECRET";
// without CRON_SECRET configured the route refuses everyone.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await sendWeeklySummaries(prisma));
}
