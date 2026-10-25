import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { BAG_SCAN_MODEL } from "./bagScan";

// Latin-script names for lots and roasters approved without one. The catalog
// needs a Latin name (the website shows it and URLs are built from it), but the
// admin shouldn't have to type it: Claude writes the Arabic brand names in Latin
// letters the way the brand would (a name, not a translation). Without an API key
// a plain letter-by-letter transliteration is used.

export interface LatinNames {
  name: string;
  roasterName: string;
}

export interface LatinNamer {
  latinize(nameAr: string, roasterNameAr: string): Promise<LatinNames>;
}

const Output = z.object({ name: z.string(), roasterName: z.string() });

export function claudeLatinNamer(apiKey: string): LatinNamer {
  const client = new Anthropic({ apiKey });
  return {
    async latinize(nameAr, roasterNameAr) {
      const response = await client.messages.parse({
        model: BAG_SCAN_MODEL,
        max_tokens: 1000,
        output_config: { effort: "low", format: zodOutputFormat(Output) },
        system: `You write Arabic coffee brand names in Latin letters for a specialty coffee catalog.
Write each name as the brand would spell it in English: a transliteration, never a translation of its meaning (e.g. "بلاك نايت" -> "Black Knight" because it is already an English phrase written in Arabic letters, but "ادهم" -> "Adham", "كامل ستيب" -> "Camel Step", "مسار" -> "Masar").
Use title case and no quotes. Return only the two names.`,
        messages: [{ role: "user", content: `Coffee name: ${nameAr}\nRoaster name: ${roasterNameAr}` }],
      });
      const out = response.parsed_output;
      if (response.stop_reason === "refusal" || !out) throw new Error("latinize: no usable output");
      return { name: out.name.trim(), roasterName: out.roasterName.trim() };
    },
  };
}

const LETTERS: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "i", "آ": "a", "ء": "", "ؤ": "u", "ئ": "i", "ب": "b", "ت": "t", "ث": "th",
  "ج": "j", "ح": "h", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s",
  "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m",
  "ن": "n", "ه": "h", "ة": "a", "و": "w", "ي": "y", "ى": "a", "پ": "p", "چ": "ch", "ڤ": "v", "گ": "g",
};

/** Letter-by-letter fallback; Latin characters and digits pass through. */
export function transliterate(text: string): string {
  const latin = [...text.normalize("NFC")]
    .map((ch) => (ch in LETTERS ? LETTERS[ch] : /[ً-ْـ]/.test(ch) ? "" : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return latin.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** Uses Claude when available and falls back to transliteration on any failure. */
export async function latinNames(namer: LatinNamer | null, nameAr: string, roasterNameAr: string): Promise<LatinNames> {
  const fallback = { name: transliterate(nameAr), roasterName: transliterate(roasterNameAr) };
  if (!namer) return fallback;
  try {
    const out = await namer.latinize(nameAr, roasterNameAr);
    const ok = (s: string) => /[A-Za-z]/.test(s) && s.length <= 120;
    return { name: ok(out.name) ? out.name : fallback.name, roasterName: ok(out.roasterName) ? out.roasterName : fallback.roasterName };
  } catch {
    return fallback;
  }
}
