import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANDROID_APK_URL, ANDROID_PAGE, APP_STORE_URL } from "@/lib/site";
import { cleanSource, isBot, platformOf, recordClick, type ClickPlatform } from "@/lib/siteClicks";

// GET /get[?from=hero][&p=ios|android|apk] — where every download button points. Sends an
// iPhone to the App Store, an Android phone to the install page (or, with p=apk, the file),
// and a computer to the download section with the QR code. Counts the tap on the way.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ua = req.headers.get("user-agent");
  const asked = url.searchParams.get("p");
  const platform: ClickPlatform = asked === "ios" || asked === "android" || asked === "apk" ? asked : platformOf(ua);
  const target =
    platform === "ios" ? APP_STORE_URL
    : platform === "apk" ? new URL(ANDROID_APK_URL, url.origin).toString()
    : platform === "android" ? new URL(ANDROID_PAGE, url.origin).toString()
    : new URL("/#download", url.origin).toString();
  if (!isBot(ua)) await recordClick(prisma, cleanSource(url.searchParams.get("from")), platform);
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
