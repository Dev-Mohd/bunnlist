import type { BrewMethod, CoffeeProcess } from "@prisma/client";

export const brewMethodLabels: Record<BrewMethod, string> = {
  ESPRESSO: "إسبريسو",
  V60: "V60",
  CHEMEX: "كيمكس",
  AEROPRESS: "إيروبريس",
  FRENCH_PRESS: "فرنش بريس",
  COLD_BREW: "كولد برو",
  OTHER: "أخرى",
};

export const processLabels: Record<CoffeeProcess, string> = {
  NATURAL: "طبيعية",
  WASHED: "مغسولة",
  HONEY: "عسلية",
  ANAEROBIC: "لاهوائية",
  WET_HULLED: "شبه مغسولة",
  CARBONIC_MACERATION: "تخمير كربوني",
  EXPERIMENTAL: "تجريبية",
  OTHER: "أخرى",
};

export const varietyLabels: Record<string, string> = {
  Geisha: "جيشا",
  Bourbon: "بوربون",
  Typica: "تيبيكا",
  Caturra: "كاتورا",
  "Pink Bourbon": "بينك بوربون",
};

export function formatBrewMethod(method: BrewMethod) {
  return brewMethodLabels[method] ?? method;
}

export function formatProcess(process: CoffeeProcess, fallback?: string | null) {
  return processLabels[process] || fallback || process;
}

export function formatVariety(variety?: string | null) {
  if (!variety) {
    return null;
  }

  return varietyLabels[variety] ?? variety;
}
