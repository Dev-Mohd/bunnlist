import { describe, expect, it } from "vitest";
import { groupNews, hash, pickOfTheDay, riyadhDay, topShared } from "../forYou";
import { sharedPercent } from "../people";

describe("pickOfTheDay", () => {
  const scored = Array.from({ length: 30 }, (_, i) => ({ id: `lot${i}`, score: i }));

  it("stays the same all day for one person and picks among the best few", () => {
    const a = pickOfTheDay(scored, "acc1", "2026-11-01");
    expect(pickOfTheDay(scored, "acc1", "2026-11-01")).toEqual(a);
    expect(a!.score).toBeGreaterThanOrEqual(18); // top 12 of 0..29
  });

  it("changes across days and people", () => {
    const days = new Set(["01", "02", "03", "04", "05", "06", "07"].map((d) => pickOfTheDay(scored, "acc1", `2026-11-${d}`)!.id));
    expect(days.size).toBeGreaterThan(1);
    const people = new Set(["a", "b", "c", "d", "e", "f"].map((p) => pickOfTheDay(scored, p, "2026-11-01")!.id));
    expect(people.size).toBeGreaterThan(1);
  });

  it("returns nothing without candidates", () => {
    expect(pickOfTheDay([], "acc1", "2026-11-01")).toBeNull();
  });
});

describe("riyadhDay", () => {
  it("rolls over at midnight in Riyadh, not UTC", () => {
    expect(riyadhDay(new Date("2026-11-01T20:59:00Z"))).toBe("2026-11-01");
    expect(riyadhDay(new Date("2026-11-01T21:01:00Z"))).toBe("2026-11-02");
  });

  it("hashes stably", () => {
    expect(hash("x")).toBe(hash("x"));
    expect(hash("x")).not.toBe(hash("y"));
  });
});

describe("groupNews", () => {
  it("groups by roaster with the newest roaster and coffee first", () => {
    const d = (day: number) => new Date(Date.UTC(2026, 9, day));
    const news = groupNews([
      { roasterNameAr: "أولالا", slug: "a1", nameAr: "أ١", imageUrl: null, publishedAt: d(10) },
      { roasterNameAr: "شفل", slug: "s1", nameAr: "ش١", imageUrl: null, publishedAt: d(20) },
      { roasterNameAr: "أولالا", slug: "a2", nameAr: "أ٢", imageUrl: null, publishedAt: d(15) },
    ]);
    expect(news.map((n) => n.roasterNameAr)).toEqual(["شفل", "أولالا"]);
    expect(news[1].lots.map((l) => l.slug)).toEqual(["a2", "a1"]);
  });
});

describe("topShared", () => {
  it("counts each person once per coffee and ranks by people", () => {
    const top = topShared([
      { lotId: "x", accountId: "1" }, { lotId: "x", accountId: "1" }, { lotId: "y", accountId: "1" },
      { lotId: "y", accountId: "2" }, { lotId: "y", accountId: "3" }, { lotId: "x", accountId: "2" },
    ]);
    expect(top.map((t) => [t.lotId, t.people.length])).toEqual([["y", 3], ["x", 2]]);
  });
});

describe("sharedPercent", () => {
  it("is shy with small collections and never 100", () => {
    expect(sharedPercent(2, 2)).toBe(40);
    expect(sharedPercent(10, 10)).toBe(99);
    expect(sharedPercent(3, 12)).toBe(25);
    expect(sharedPercent(0, 12)).toBe(0);
  });
});
