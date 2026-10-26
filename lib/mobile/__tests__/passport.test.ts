import { describe, it, expect } from "vitest";
import { buildPassport, type TastedLot } from "../passport";

const lot = (id: string, code: string | null, process = "NATURAL", extra: Partial<TastedLot> = {}): TastedLot => ({
  lotId: id, at: new Date(`2026-10-${10 + Number(id)}T10:00:00Z`), process, variety: null,
  origin: code ? { code, nameAr: code } : null, tags: [], ...extra,
});

describe("buildPassport", () => {
  it("stamps each origin once, earliest first, and skips blends", () => {
    const p = buildPassport([lot("3", "ET"), lot("1", "ET"), lot("2", "CO", "WASHED"), lot("4", "XB"), lot("5", null)]);
    expect(p.countries).toBe(2);
    expect(p.stamps.map((s) => [s.code, s.count])).toEqual([["ET", 2], ["CO", 1]]);
    expect(p.stamps[0].firstAt).toBe("2026-10-11T10:00:00.000Z");
    expect(p.coffees).toBe(5);
  });

  it("tracks badges with progress", () => {
    const p = buildPassport([
      lot("1", "ET"), lot("2", "CO", "WASHED"), lot("3", "YE", "HONEY"), lot("4", "ID", "ANAEROBIC", { variety: "Gesha" }),
      lot("5", "YE", "NATURAL", { tags: ["luxury"] }),
    ]);
    const get = (id: string) => p.badges.find((b) => b.id === id)!;
    expect(get("continents")).toMatchObject({ current: 4, earned: true });
    expect(get("processes").earned).toBe(true);
    expect(get("gesha").earned).toBe(true);
    expect(get("yemeni")).toMatchObject({ current: 2, goal: 3, earned: false });
    expect(get("explorer")).toMatchObject({ current: 4, earned: false });
  });
});
