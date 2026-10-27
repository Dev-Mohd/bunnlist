import { describe, it, expect } from "vitest";
import { rank, scoreSignals, MIN_PEOPLE, type Signal, type LotScore } from "../home";

const now = new Date("2026-11-06T12:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const sig = (lotId: string, accountId: string, kind: Signal["kind"], days = 0): Signal => ({ lotId, accountId, kind, at: ago(days) });

describe("scoreSignals", () => {
  it("weighs brews and ratings 3, adds and recipes 2, today in full", () => {
    const [s] = scoreSignals([sig("a", "u1", "brew"), sig("a", "u2", "review"), sig("a", "u3", "collect"), sig("a", "u4", "recipe")], now);
    expect(s.score).toBe(10);
    expect(s.people).toBe(4);
    expect(s.counts).toEqual({ brew: 1, review: 1, collect: 1, recipe: 1 });
  });
  it("counts a person once per coffee and kind", () => {
    const [s] = scoreSignals([sig("a", "u1", "brew"), sig("a", "u1", "brew", 1), sig("a", "u1", "brew", 2)], now);
    expect(s.counts.brew).toBe(1);
    expect(s.score).toBe(3);
  });
  it("halves week-old activity and ignores older", () => {
    const list = scoreSignals([sig("a", "u1", "brew", 7), sig("a", "u2", "brew", 8)], now);
    expect(list[0].score).toBe(1.5);
    expect(list[0].people).toBe(1);
  });
});

describe("rank", () => {
  const score = (lotId: string, s: number, people = MIN_PEOPLE): LotScore =>
    ({ lotId, score: s, people, counts: { brew: 0, review: 0, collect: 0, recipe: 0 } });

  it("needs three people, and reports movement against last week", () => {
    const out = rank([score("a", 20), score("b", 15), score("solo", 99, 1)], [score("b", 9), score("a", 5)], []);
    expect(out.map((r) => r.lotId)).toEqual(["a", "b"]);
    expect(out[0].move).toBe(1);   // was 2nd
    expect(out[1].move).toBe(-1);  // was 1st
  });
  it("marks new entries with a null move", () => {
    expect(rank([score("c", 5)], [], [])[0].move).toBeNull();
  });
  it("puts pins first and leaves hidden out", () => {
    const out = rank([score("a", 20), score("b", 15)], [], [{ lotId: "x", mode: "pin" }, { lotId: "a", mode: "hide" }]);
    expect(out.map((r) => [r.lotId, r.pinned])).toEqual([["x", true], ["b", false]]);
  });
});
