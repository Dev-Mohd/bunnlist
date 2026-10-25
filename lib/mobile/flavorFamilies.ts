// Flavor families for free-text notes. Mirrors the app's FlavorFamily
// (BunnListCore/TasteFingerprint.swift): same codes, same keywords, same order,
// first match wins. Keep the two in step.

export const FLAVOR_FAMILIES = [
  "berry", "citrus", "stoneFruit", "tropical", "driedFruit", "floral", "chocolate",
  "caramel", "nutty", "spice", "tea", "honey",
] as const;
export type FlavorFamily = (typeof FLAVOR_FAMILIES)[number] | "other";

const KEYWORDS: Record<(typeof FLAVOR_FAMILIES)[number], string[]> = {
  berry: ["توت", "فراول", "كرز", "عنب", "رمان", "berry", "strawberr", "cherr", "grape", "pomegranate", "cassis", "currant"],
  citrus: ["ليمون", "برتقال", "حمضي", "جريب", "يوسفي", "ليم", "lemon", "orange", "citrus", "grapefruit", "lime", "bergamot", "tangerine"],
  stoneFruit: ["خوخ", "مشمش", "دراق", "نكتارين", "برقوق", "peach", "apricot", "nectarine", "plum", "stone fruit"],
  tropical: ["مانجو", "أناناس", "اناناس", "استوائ", "باشن", "بابايا", "جوافة", "ليتشي", "mango", "pineapple", "tropical", "passion", "papaya", "guava", "lychee"],
  driedFruit: ["زبيب", "تمر", "تين", "مجفف", "raisin", "date", "fig", "dried", "prune"],
  floral: ["زهر", "ياسمين", "ورد", "لافند", "بنفسج", "floral", "jasmine", "rose", "lavender", "violet", "hibiscus", "blossom"],
  chocolate: ["شوكولا", "كاكاو", "chocolate", "cocoa", "cacao"],
  caramel: ["كراميل", "سكر", "توفي", "فانيل", "caramel", "sugar", "toffee", "vanilla", "molasses", "butterscotch"],
  nutty: ["مكسرات", "لوز", "بندق", "جوز", "فستق", "nut", "almond", "hazelnut", "walnut", "pistachio", "peanut"],
  spice: ["بهار", "قرفة", "هيل", "قرنفل", "زنجبيل", "فلفل", "spice", "cinnamon", "cardamom", "clove", "ginger", "pepper"],
  tea: ["شاي", "شمام", "بطيخ", "تفاح", "كمثرى", "عشب", "نعناع", "tea", "melon", "apple", "pear", "herb", "mint", "green"],
  honey: ["عسل", "honey"],
};

export function flavorFamily(note: string): FlavorFamily {
  const text = note.toLowerCase();
  return FLAVOR_FAMILIES.find((f) => KEYWORDS[f].some((k) => text.includes(k))) ?? "other";
}
