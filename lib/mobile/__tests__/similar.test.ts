import { describe, expect, it } from "vitest";
import { rankSimilar, similarity } from "../similar";

const f = (id: string, roasterId: string, notes: string[], process = "NATURAL", origin: string | null = "ET", reviews = 0, rating = 0) =>
  ({ id, roasterId, notes, process, origin, reviews, rating });

describe("similarity", () => {
  it("rates shared flavour families highest and says which", () => {
    const a = f("a", "r1", ["توت", "ياسمين", "شوكولاتة"]);
    const b = f("b", "r2", ["فراولة", "زهور"]);
    const r = similarity(a, b);
    expect(r.score).toBeGreaterThan(2);
    expect(r.reason).toBe("نفس النكهات: توت، زهري");
  });

  it("falls back to origin and process, and finds nothing in common otherwise", () => {
    expect(similarity(f("a", "r1", ["توت"]), f("b", "r2", ["شوكولاتة"])).reason).toBe("نفس المنشأ والمعالجة");
    expect(similarity(f("a", "r1", ["توت"], "WASHED", "CO"), f("b", "r2", ["شوكولاتة"], "NATURAL", "BR")).score).toBe(0);
    // A blend or an unknown process isn't a likeness.
    expect(similarity(f("a", "r1", [], "MIXED", "XB"), f("b", "r2", [], "MIXED", "XB")).score).toBe(0);
  });
});

describe("rankSimilar", () => {
  it("leaves out the same roaster and weak matches, closest first", () => {
    const target = f("t", "r1", ["توت", "ياسمين"]);
    const ranked = rankSimilar(target, [
      target,
      f("same", "r1", ["توت", "ياسمين"]),
      f("close", "r2", ["توت", "زهور"]),
      f("half", "r3", ["توت", "شوكولاتة"]),
      f("far", "r4", ["شوكولاتة"], "WASHED", "BR"),
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["close", "half"]);
  });

  it("lets ratings break a tie but not beat a closer match", () => {
    const target = f("t", "r1", ["توت"]);
    const ranked = rankSimilar(target, [f("a", "r2", ["توت"]), f("b", "r3", ["توت"], "NATURAL", "ET", 10, 5)]);
    expect(ranked[0].id).toBe("b");
  });
});
