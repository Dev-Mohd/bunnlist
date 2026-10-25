import { describe, it, expect, vi } from "vitest";
import { latinNames, transliterate, type LatinNamer } from "../latinNames";

describe("transliterate", () => {
  it("writes Arabic letters in Latin and title-cases words", () => {
    expect(transliterate("ادهم")).toBe("Adhm");
    expect(transliterate("مسار")).toBe("Msar");
    expect(transliterate("3 Bean")).toBe("3 Bean");
  });
});

describe("latinNames", () => {
  it("uses the model's names when they are Latin", async () => {
    const namer: LatinNamer = { latinize: vi.fn().mockResolvedValue({ name: "Adham", roasterName: "Black Knight" }) };
    expect(await latinNames(namer, "ادهم", "بلاك نايت")).toEqual({ name: "Adham", roasterName: "Black Knight" });
  });
  it("falls back to transliteration without a model, on errors or non-Latin output", async () => {
    expect((await latinNames(null, "ادهم", "مسار")).name).toBe("Adhm");
    const failing: LatinNamer = { latinize: vi.fn().mockRejectedValue(new Error("down")) };
    expect((await latinNames(failing, "ادهم", "مسار")).roasterName).toBe("Msar");
    const arabic: LatinNamer = { latinize: vi.fn().mockResolvedValue({ name: "ادهم", roasterName: "Masar" }) };
    expect(await latinNames(arabic, "ادهم", "مسار")).toEqual({ name: "Adhm", roasterName: "Masar" });
  });
});
