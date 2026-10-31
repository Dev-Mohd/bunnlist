import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublishedLot } from "@/lib/mobile/catalog";
import { redirectedSlug } from "@/lib/mobile/duplicates";

// GET /api/v1/catalog/lots/[slug] — public detail for one published lot. A coffee merged
// into another answers with the one that stayed (its own slug in the body).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    let lot = await getPublishedLot(prisma, slug);
    if (!lot) {
      const moved = await redirectedSlug(prisma, slug);
      if (moved) lot = await getPublishedLot(prisma, moved);
    }
    if (!lot) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(lot, { status: 200 });
  } catch (err) {
    console.error("catalog detail error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
