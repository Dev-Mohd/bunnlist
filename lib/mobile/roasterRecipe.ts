// A roaster's own brew recipe, read from its product page text with fixed rules
// (labels such as «كمية القهوة: 19 جرام»), never guessed: a recipe is kept only
// when it names the coffee dose and the water or the time.

export type RecipeMethod = "V60" | "ESPRESSO" | "CHEMEX" | "AEROPRESS";

export interface RoasterRecipe {
  method: RecipeMethod;
  /** The tool as the roaster wrote it ("عين تايمور V60"), when given. */
  tool: string | null;
  doseG: number;
  waterMl: number | null;
  tempC: number | null;
  timeSec: number | null;
  grind: string | null;
  /** Water per gram (15 for 1:15), as written or worked out from dose and water. */
  ratio: number | null;
  steps: string[];
}

const DIGITS: Record<string, string> = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "٫": "." };

function normalize(text: string): string {
  return text
    .replace(/[٠-٩٫]/g, (d) => DIGITS[d])
    .replace(/[\u200e\u200f\u202a-\u202e\u064b-\u0652\u0640]/g, "")
    .replace(/\s*\/\s*/g, "\n")
    .replace(/[ \t\u00a0]+/g, " ");
}

const GRAM = "(?:جرام|غرام|قرام|grams?|(?:جم|غم|غ|gr?|ج)(?![\\p{L}]))";
const n = (s: string | undefined) => (s === undefined ? null : Number(s));
const within = (v: number | null, lo: number, hi: number) => (v !== null && v >= lo && v <= hi ? v : null);

function first(seg: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const p of patterns) {
    const m = seg.match(p);
    if (m) return m;
  }
  return null;
}

function seconds(raw: string | undefined): number | null {
  if (!raw) return null;
  const clock = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const s = raw.match(/^(\d{2,3})/);
  return s ? Number(s[1]) : null;
}

function methodOf(text: string): RecipeMethod | null {
  if (/إسبريسو|اسبريسو|الإسبريسو|الاسبريسو|espresso/i.test(text)) return "ESPRESSO";
  if (/كيمكس|chemex/i.test(text)) return "CHEMEX";
  if (/إيروبرس|ايروبرس|aeropress/i.test(text)) return "AEROPRESS";
  if (/v60|تقطير|للتقطير|المقطرة|الترشيح|فلتر|filter|pour/i.test(text)) return "V60";
  return null;
}

const LABEL_STOP = /\n|كمية|الطحنة|درجة|حرارة|الماء|وقت|مدة|الخطوات|طريقة|الوزن|الريشو|النسبة/;

function steps(seg: string): string[] {
  const start = seg.search(/(?:الخطوات|طريقة التحضير)\s*:?/);
  if (start < 0) return [];
  const body = seg.slice(start).replace(/^(?:الخطوات|طريقة التحضير)\s*:?/, "")
    .split(/تناسب|يناسب|ملاحظة|ينصح|نقترح|ننصح|استمتع|وصفة|ينتهي/)[0];
  let parts = body.split(/(?:^|\n|\s)\d\s*[-–.)]\s*/).map((p) => p.trim());
  if (parts.filter(Boolean).length < 2) parts = body.split(/(?=الصبة|تصب|صب الماء|الترطيب|آخر صب)/).map((p) => p.trim());
  const out = parts
    .map((p) => p.replace(/\n+/g, " ").replace(/\s+/g, " ").replace(/[،,.\s]+$/, ""))
    .filter((p) => p.length >= 4 && p.length <= 110 && /\d/.test(p));
  return out.length >= 2 ? out.slice(0, 7) : [];
}

function parseSegment(seg: string, hint: RecipeMethod | null): RoasterRecipe | null {
  const dose = within(n(first(seg, [
    new RegExp(`(?:كمية القهوة|وزن القهوة|الوزن|المكونات|القهوة)\\s*:?\\s*(\\d+(?:\\.\\d+)?)\\s*${GRAM}`, "u"),
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${GRAM}`, "u"),
  ])?.[1]), 7, 30);
  if (dose === null) return null;

  let water = within(n(seg.match(/(?:كمية الماء|الماء|الاستخلاص|الإستخلاص|المخرج|كمية المشروب)\s*:?\s*(\d+)\s*(?:مل|ml)/i)?.[1]), 15, 600);
  if (water === null) {
    const all = [...seg.matchAll(/(\d+)\s*(?:مل|ml)/gi)].map((m) => Number(m[1])).filter((v) => v >= 150 && v <= 600);
    if (all.length) water = Math.max(...all);
  }
  const temp = within(n(first(seg, [
    /(?:درجة حرارة الماء|حرارة الماء|درجة الحرارة|الحرارة)\s*:?\s*(\d{2})/,
    /(\d{2})\s*(?:°|درجة مئوية|درجة)/,
  ])?.[1]), 80, 100);
  const time = within(seconds(seg.match(/(?:وقت التحضير|مدة التحضير|وقت الإستخلاص|وقت الاستخلاص|مدة الاستخلاص|مدة الإستخلاص)\s*:?\s*(\d{1,2}:\d{2}|\d{2,3}(?:\s*-\s*\d{2,3})?\s*ثاني)/)?.[1]), 15, 420);
  if (water === null && time === null) return null;

  const grind = seg.match(/(?:درجة الطحنة|الطحنة|الطحن)\s*:?\s*(ناعمة جد[اًا]|متوسطة النعومة|متوسطة ناعمة|متوسطة الخشونة|متوسطة خشنة|متوسطة|ناعمة|خشنة)/)?.[1] ?? null;
  const toolRaw = seg.match(/الأداة\s*:\s*([^\n]{2,40})/)?.[1];
  const tool = toolRaw ? toolRaw.split(LABEL_STOP)[0].trim() || null : null;
  const header = seg.slice(0, 90);
  let method = methodOf(tool ?? "") ?? methodOf(header) ?? hint;
  if (water !== null && water <= 80) method = "ESPRESSO";
  if (!method) method = water !== null && water >= 150 ? "V60" : null;
  if (!method) return null;

  const written = within(n(seg.match(/(?:الريشو|النسبة|نسبة)\s*:?\s*(?:1\s*[:/]\s*)?(\d{1,2}(?:\.\d)?)(?!\d)/)?.[1]), 1.5, 20);
  const ratio = written ?? (water !== null ? Math.round((water / dose) * 10) / 10 : null);
  return { method, tool, doseG: dose, waterMl: water, tempC: temp, timeSec: time, grind, ratio, steps: method === "ESPRESSO" ? [] : steps(seg) };
}

/** The recipes in a product description, filter recipes first; empty when there are none. */
export function parseRoasterRecipes(text: string | null | undefined): RoasterRecipe[] {
  if (!text) return [];
  const t = normalize(text);
  const starts = [...t.matchAll(/(?:ال)?وصفة|الأداة\s*:/g)].map((m) => m.index ?? 0);
  if (!starts.length) return [];
  const out: RoasterRecipe[] = [];
  let hint: RecipeMethod | null = null;
  starts.forEach((s, i) => {
    const seg = t.slice(s, starts[i + 1] ?? t.length);
    if (/x\s?bloom|اكسبلوم|إكسبلوم/i.test(seg.slice(0, 60))) { hint = null; return; }
    const r = parseSegment(seg, hint ?? methodOf(seg.slice(0, 60)));
    if (r) {
      if (!out.some((o) => JSON.stringify(o) === JSON.stringify(r))) out.push(r);
      hint = null;
    } else {
      hint = methodOf(seg.slice(0, 60)) ?? hint;
    }
  });
  return out.sort((a, b) => Number(a.method === "ESPRESSO") - Number(b.method === "ESPRESSO"));
}

/** Stores that sell many roasters' coffee: their links are not the roaster's own page. */
const STORES: Record<string, string> = { "yahimcups.com": "يحيم كبس" };

export interface BuyLink {
  url: string;
  host: string;
  /** "roaster": the roaster's own store; "store": a shop selling it. */
  kind: "roaster" | "store";
  storeNameAr: string | null;
}

export function buyLink(url: string | null | undefined): BuyLink | null {
  if (!url) return null;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.replace(/^www\./, "");
  const store = STORES[host];
  return { url: parsed.toString(), host, kind: store ? "store" : "roaster", storeNameAr: store ?? null };
}
