import { appConfig } from "@/lib/mobile/appConfig";

// GET /api/v1/app/config — public: the minimum and latest app builds per platform and the store links.
// Cached briefly at the edge; a change in Vercel takes effect within minutes of a redeploy.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(appConfig(), { headers: { "cache-control": "public, max-age=60, s-maxage=300" } });
}
