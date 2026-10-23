import { describe, it, expect } from "vitest";
import { mapLot, mapLotDetail, type CoffeeLotRow, type CoffeeLotDetailRow } from "../catalog";

const row: CoffeeLotRow = {
  id: "lot-1",
  slug: "yirgacheffe-natural",
  name: "Yirgacheffe Natural",
  nameAr: "يرجاتشيف طبيعي",
  process: "NATURAL",
  processLabel: "Natural",
  flavorNotes: ["فراولة", "ياسمين"],
  roastLevel: "فاتح",
  averageRating: "4.5",
  reviewCount: 12,
  imageUrl: "https://img/x.jpg",
  roaster: { nameAr: "كامل ستيب", name: "Camel Step" },
  originCountry: { nameAr: "إثيوبيا", isoCode: "ET" },
};

describe("mapLot", () => {
  it("maps a DB row to the mobile DTO", () => {
    expect(mapLot(row)).toEqual({
      id: "lot-1",
      slug: "yirgacheffe-natural",
      name: "Yirgacheffe Natural",
      nameAr: "يرجاتشيف طبيعي",
      roasterNameAr: "كامل ستيب",
      originNameAr: "إثيوبيا",
      originCode: "ET",
      process: "NATURAL",
      processLabel: "Natural",
      flavorNotes: ["فراولة", "ياسمين"],
      roastLevel: "فاتح",
      averageRating: 4.5,
      reviewCount: 12,
      imageUrl: "https://img/x.jpg",
    });
  });

  it("coerces a Decimal-like rating and tolerates missing optionals", () => {
    const mapped = mapLot({
      ...row,
      averageRating: 0 as unknown as string,
      processLabel: null,
      roastLevel: null,
      imageUrl: null,
      originCountry: null,
    });
    expect(mapped.averageRating).toBe(0);
    expect(mapped.processLabel).toBeNull();
    expect(mapped.originNameAr).toBeNull();
    expect(mapped.originCode).toBeNull();
    expect(mapped.imageUrl).toBeNull();
  });
});

describe("mapLotDetail", () => {
  const detailRow: CoffeeLotDetailRow = {
    ...row,
    descriptionAr: "وصف عربي",
    regionAr: "يرجاتشيف",
    variety: "Heirloom",
    recommendedBrewMethods: ["V60", "CHEMEX"],
    brewStats: [
      { brewMethod: "V60", averageRating: "4.8", reviewCount: 5, wouldBuyAgain: 4 },
      { brewMethod: "ESPRESSO", averageRating: 4, reviewCount: 9, wouldBuyAgain: 7 },
    ],
  };

  it("includes detail fields and sorts brew stats by review count", () => {
    const d = mapLotDetail(detailRow);
    expect(d.nameAr).toBe("يرجاتشيف طبيعي"); // base fields preserved
    expect(d.descriptionAr).toBe("وصف عربي");
    expect(d.regionAr).toBe("يرجاتشيف");
    expect(d.recommendedBrewMethods).toEqual(["V60", "CHEMEX"]);
    expect(d.brewStats.map((s) => s.method)).toEqual(["ESPRESSO", "V60"]); // 9 then 5
    expect(d.brewStats[1].averageRating).toBe(4.8);
  });
});
