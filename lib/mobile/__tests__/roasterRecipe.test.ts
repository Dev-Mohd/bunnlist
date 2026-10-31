import { describe, expect, it } from "vitest";
import { buyLink, parseRoasterRecipes } from "../roasterRecipe";

describe("parseRoasterRecipes", () => {
  it("reads a labelled filter recipe with numbered pours", () => {
    const text = `قهوة مجففة / وصفة تقطير: / الأداة: عين تايمور V60 / كمية القهوة: 19جرام / الطحنة: متوسطة النعومة / حرارة الماء: 94 درجة مئوية / كمية الماء: 270مل / وقت التحضير: 2:15 / الخطوات: / 1- الترطيب على كامل القهوة إلى 35مل والانتظار 40 ثانية / 2- الصب إلى 135 مل والانتظار 10 ثواني / 3- الصب إلى 270مل في المنتصف`;
    const [r] = parseRoasterRecipes(text);
    expect(r).toMatchObject({ method: "V60", tool: "عين تايمور V60", doseG: 19, waterMl: 270, tempC: 94, timeSec: 135, grind: "متوسطة النعومة" });
    expect(r.ratio).toBeCloseTo(14.2);
    expect(r.steps).toHaveLength(3);
    expect(r.steps[0]).toContain("35مل");
  });

  it("reads text glued together without spaces, and keeps a written ratio", () => {
    const text = "شاي الفواكهالوصفة المقترحة للتقطير (V60)درجة الحرارة: 90الوزن: 18 غرامكمية الماء: 270 ملالريشو: 15طريقة التحضير:الصبة الأولى 40 مل الوقت: 0:30";
    const [r] = parseRoasterRecipes(text);
    expect(r).toMatchObject({ method: "V60", doseG: 18, waterMl: 270, tempC: 90, ratio: 15, timeSec: null, steps: [] });
  });

  it("keeps espresso and filter apart, filter first, with pours split", () => {
    const text = "وصفة مقترحة للإسبريسو : كمية القهوة : 20 جرام كمية الماء : 30 مل درجة حرارة الماء : 90 درجة وقت الإستخلاص : 28-30 ثانية وصفة مقترحة للقهوة المقطرة : كمية القهوة : 20 جرام كمية الماء : 300 مل درجة حرارة الماء : 90 وقت الإستخلاص : 2:30 - 2:45 درجة الطحنة : متوسطة V60 طريقة التحضير : تصب 50 مل تصب الى 120 مل تصب الى 245 مل آخر صبه الى 300 مل ينتهي الإستخلاص في 2:30 نقترح ترك القهوة";
    const [filter, espresso] = parseRoasterRecipes(text);
    expect(filter).toMatchObject({ method: "V60", doseG: 20, waterMl: 300, timeSec: 150, grind: "متوسطة" });
    expect(filter.steps).toEqual(["تصب 50 مل", "تصب الى 120 مل", "تصب الى 245 مل", "آخر صبه الى 300 مل"]);
    expect(espresso).toMatchObject({ method: "ESPRESSO", doseG: 20, waterMl: 30, timeSec: 28, steps: [] });
  });

  it("reads an espresso yield and Arabic digits", () => {
    const [r] = parseRoasterRecipes("الوصفة المقترحة الاسبريسو درجة الحرارة: ٩٠ الوزن: ١٨ جرام الاستخلاص: ٣٢مل وقت التحضير: ٣٠ ثانية");
    expect(r).toMatchObject({ method: "ESPRESSO", doseG: 18, waterMl: 32, tempC: 90, timeSec: 30 });
  });

  it("finds nothing in plain descriptions, bag weights or machine-only recipes", () => {
    expect(parseRoasterRecipes("قهوة من حراز على ارتفاع 2200 متر. الوزن 250g. تحفظ في درجة حرارة بين 15 و25 درجة مئوية.")).toEqual([]);
    expect(parseRoasterRecipes("وصفة تحضير على جهاز الاكسبلوم")).toEqual([]);
    expect(parseRoasterRecipes("وصفة مقترحة للتقطير : كمية القهوة: ")).toEqual([]);
    expect(parseRoasterRecipes(null)).toEqual([]);
  });
});

describe("buyLink", () => {
  it("tells a roaster's own store from a shop selling many roasters", () => {
    expect(buyLink("https://www.olalaroastery.com/p/123")).toMatchObject({ host: "olalaroastery.com", kind: "roaster", storeNameAr: null });
    expect(buyLink("https://yahimcups.com/x")).toMatchObject({ kind: "store", storeNameAr: "يحيم كبس" });
  });

  it("drops anything that isn't a web link", () => {
    expect(buyLink("javascript:alert(1)")).toBeNull();
    expect(buyLink("not a url")).toBeNull();
    expect(buyLink(null)).toBeNull();
  });
});
