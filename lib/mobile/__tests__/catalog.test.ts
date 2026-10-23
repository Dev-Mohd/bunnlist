import { describe, it, expect } from "vitest";
import { mapLot, type CoffeeLotRow } from "../catalog";

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
