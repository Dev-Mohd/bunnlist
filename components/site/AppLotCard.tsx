import Image from "next/image";
import { flavorFamily, type FlavorFamily } from "@/lib/mobile/flavorFamilies";
import type { ShelfLot } from "@/lib/site-bags";

// A coffee as the app shows it in «اكتشف» (DiscoverLotCard + LotPhotoWell): the bag
// multiplied over a soft wash of its main flavor's color, with a light shadow
// under it; then the name, flag, origin and process, three flavor dots, and the
// real rating or an invitation to rate.

const FAMILY_RGB: Record<FlavorFamily, [number, number, number]> = {
  berry: [0.72, 0.2, 0.27], citrus: [0.95, 0.74, 0.2], stoneFruit: [0.93, 0.58, 0.36], tropical: [0.98, 0.62, 0.15],
  driedFruit: [0.55, 0.27, 0.3], floral: [0.76, 0.56, 0.86], chocolate: [0.36, 0.22, 0.15], caramel: [0.78, 0.52, 0.24],
  nutty: [0.64, 0.47, 0.3], spice: [0.66, 0.3, 0.16], tea: [0.52, 0.66, 0.33], honey: [0.89, 0.69, 0.25],
  other: [0.55, 0.53, 0.4],
};
const GOLD = "#987024";

const rgba = (f: FlavorFamily, a = 1) => {
  const [r, g, b] = FAMILY_RGB[f].map((v) => Math.round(v * 255));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** The first note with a family colors the card, as in the app. */
function dominant(notes: string[]): FlavorFamily {
  return notes.map(flavorFamily).find((f) => f !== "other") ?? "other";
}

function spectrum(notes: string[], limit = 3): FlavorFamily[] {
  const seen: FlavorFamily[] = [];
  for (const f of notes.map(flavorFamily)) {
    if (f !== "other" && !seen.includes(f)) seen.push(f);
    if (seen.length === limit) break;
  }
  return seen;
}

function flag(code: string | null): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code) || code.toUpperCase() === "XB") return "";
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join("");
}

export function AppLotCard({ lot, hidden = false }: { lot: ShelfLot; hidden?: boolean }) {
  const family = dominant(lot.notes);
  const origin = [flag(lot.code), lot.origin].filter(Boolean).join(" ");
  const line = [origin, lot.process].filter(Boolean).join(" · ");
  const rated = lot.reviews > 0;
  return (
    <article
      aria-hidden={hidden || undefined}
      className="group w-[164px] shrink-0 rounded-[20px] bg-white p-2 text-right shadow-[0_4px_10px_rgba(23,20,17,0.05)] transition-transform duration-300 hover:-translate-y-1 sm:w-[180px]"
      dir="rtl"
    >
      <div className="relative h-[140px] overflow-hidden rounded-[14px] bg-white" style={{ isolation: "isolate" }}>
        <div className="absolute inset-0" style={{ background: wash(family) }} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent" />
        <div className="absolute bottom-[10px] left-1/2 h-[10px] w-[70px] -translate-x-1/2 rounded-[50%] bg-black/15 blur-[5px] transition-all duration-300 group-hover:w-[86px] group-hover:bg-black/10" />
        <Image
          src={`/site/bags/${lot.file}.jpg`}
          alt={hidden ? "" : `كيس ${lot.name}`}
          fill
          sizes="180px"
          className="object-contain p-2 mix-blend-multiply transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:scale-[1.06]"
        />
      </div>
      <div className="px-1 pt-2">
        <h3 className="line-clamp-1 text-[17px] font-semibold text-[var(--ink)]">{lot.name}</h3>
        {line ? <p className="mt-0.5 line-clamp-1 text-[13px] text-[var(--ink-2)]">{line}</p> : null}
        <div className="mt-1.5 flex gap-1" aria-hidden="true">
          {spectrum(lot.notes).map((f) => (
            <span key={f} className="h-[9px] w-[9px] rounded-full" style={{ background: rgba(f) }} />
          ))}
        </div>
        <p className="mt-1 text-[12px] font-semibold" style={{ color: rated ? GOLD : "var(--accent)" }}>
          {rated ? `★ ${lot.rating.toFixed(1)} · ${lot.reviews} تقييم` : "كن أول من يقيّمها"}
        </p>
      </div>
    </article>
  );
}

/** White, a 16% wash of the flavor color, as the app's well. */
function wash(f: FlavorFamily): string {
  const color = f === "other" ? "rgba(152, 112, 36, 0.16)" : rgba(f, 0.16);
  return `linear-gradient(${color}, ${color}), #fff`;
}
