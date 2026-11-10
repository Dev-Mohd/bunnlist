import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { cleanSource, clickSummary, isBot, platformOf, recordClick } from "../siteClicks";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

describe("site download clicks", () => {
  it("tells phones apart, and everything else is a computer", () => {
    expect(platformOf(IPHONE)).toBe("ios");
    expect(platformOf(ANDROID)).toBe("android");
    expect(platformOf(MAC)).toBe("desktop");
    expect(platformOf(null)).toBe("desktop");
  });

  it("doesn't count crawlers and link previews", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("WhatsApp/2.23")).toBe(true);
    expect(isBot(IPHONE)).toBe(false);
  });

  it("keeps button names short and plain", () => {
    expect(cleanSource("hero")).toBe("hero");
    expect(cleanSource("Android-Page")).toBe("android-page");
    expect(cleanSource("<script>x</script>")).toBe("scriptxscript");
    expect(cleanSource(null)).toBe("direct");
    expect(cleanSource("a".repeat(60))).toHaveLength(24);
  });

  it("adds one to the Riyadh day's count and never throws", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const db = { siteClick: { upsert } } as unknown as PrismaClient;
    await recordClick(db, "hero", "ios", new Date("2026-11-10T22:30:00Z")); // 01:30 on the 11th in Riyadh
    expect(upsert.mock.calls[0][0].where).toEqual({ day_source_platform: { day: "2026-11-11", source: "hero", platform: "ios" } });
    expect(upsert.mock.calls[0][0].update).toEqual({ count: { increment: 1 } });
    const broken = { siteClick: { upsert: vi.fn().mockRejectedValue(new Error("db down")) } } as unknown as PrismaClient;
    await expect(recordClick(broken, "hero", "ios")).resolves.toBeUndefined();
  });

  it("sums by platform, button and day", async () => {
    const db = { siteClick: { findMany: vi.fn().mockResolvedValue([
      { day: "2026-11-09", source: "hero", platform: "ios", count: 5 },
      { day: "2026-11-10", source: "hero", platform: "android", count: 2 },
      { day: "2026-11-10", source: "bar", platform: "ios", count: 3 },
    ]) } } as unknown as PrismaClient;
    const s = await clickSummary(db, 30, new Date("2026-11-10T12:00:00Z"));
    expect(s.total).toBe(10);
    expect(s.byPlatform).toEqual({ ios: 8, android: 2 });
    expect(s.bySource).toEqual({ hero: 7, bar: 3 });
    expect(s.byDay).toEqual([{ day: "2026-11-09", count: 5 }, { day: "2026-11-10", count: 5 }]);
  });
});
