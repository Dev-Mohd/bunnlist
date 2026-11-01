// Roaster logos bundled in public/roasters/<slug>.png, each taken from the
// roaster's own website (source host noted). Trimmed onto a 512px transparent
// square; one white logo sits on a dark tile. Add a file here to add a logo.

export const ROASTER_LOGOS: Record<string, string> = {
  "12-cups": "media.zid.store",
  "ablah-roastery": "cdn.salla.sa",
  "admi-roastery": "cdn.salla.sa",
  "alwaal-albari": "cdn.files.salla.network",
  "arriyadh-roaster": "cdn.salla.sa",
  "asante-roastery": "media.zid.store",
  "ash": "cdn.salla.sa",
  "batch": "www.batchroastery.com",
  "black-knight": "static.zid.store",
  "breehant": "cdn.salla.sa",
  "bunista": "media.zid.store",
  "camel-step": "media.zid.store",
  "hasil-roastery": "media.zid.store",
  "jesha-roastery": "cdn.salla.sa",
  "kiffa": "media.zid.store",
  "kof": "cdn.salla.sa",
  "l-tone": "media.zid.store",
  "mahmasa-7-gram": "media.zid.store",
  "mahmasa-al-yawm-al-thamin": "cdn.salla.sa",
  "mahmasa-ananas": "media.zid.store",
  "mahmasa-aqahi": "cdn.files.salla.network",
  "mahmasa-duha": "media.zid.store",
  "mahmasa-masna-al-qahwa": "cdn.salla.sa",
  "mahmasa-oolala": "media.zid.store",
  "mahmasa-slop": "cdn.files.salla.network",
  "mamtad-roastery": "media.zid.store",
  "milano-lab": "cdn.files.salla.network",
  "oasis": "media.zid.store",
  "october": "media.zid.store",
  "oden": "cdn.salla.sa",
  "oro-roastery": "cdn.salla.sa",
  "out-of-line": "media.zid.store",
  "qaf-roastery": "cdn.salla.sa",
  "roasting-house": "roastinghouse.sa",
  "sawaa-roastery": "cdn.files.salla.network",
  "sawt-roastery": "cdn.salla.sa",
  "shovel": "media.zid.store",
  "soil-roastery": "media.zid.store",
  "sulalat": "sulalat.com",
  "w": "cdn.salla.sa",
  "yoof": "cdn.salla.sa",
};

/** The logo URL for a roaster, or null without a bundled logo. */
export function roasterLogoUrl(slug: string, origin: string | null): string | null {
  if (!origin || !(slug in ROASTER_LOGOS)) return null;
  return `${origin.replace(/\/$/, "")}/roasters/${slug}.png`;
}
