import type { BrewMethod, CoffeeProcess } from "@prisma/client";

export const brewMethodLabels: Record<BrewMethod, string> = {
  ESPRESSO: "إسبريسو",
  V60: "V60",
  CHEMEX: "كيمكس",
  AEROPRESS: "إيروبرس",
  FRENCH_PRESS: "فرنش برس",
  COLD_BREW: "كولد برو",
  OTHER: "أخرى",
};

export const processLabels: Record<CoffeeProcess, string> = {
  NATURAL: "طبيعية",
  WASHED: "مغسولة",
  HONEY: "عسلية",
  ANAEROBIC: "لاهوائية",
  CARBONIC_MACERATION: "تخمير كربوني",
  EXPERIMENTAL: "تجريبية",
  OTHER: "أخرى",
};

export function formatBrewMethod(method: BrewMethod) {
  return brewMethodLabels[method] ?? method;
}

export function formatProcess(process: CoffeeProcess, fallback?: string | null) {
  return processLabels[process] || fallback || process;
}
