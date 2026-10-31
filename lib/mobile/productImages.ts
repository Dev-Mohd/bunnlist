import sharp from "sharp";

// The product photos on a coffee's store page (Salla, Zid, Shopify or any page
// with schema.org data), so the details printed in them (a bag label, an info
// card) can be read. Only for reading text: nothing here is stored or shown.

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const UA = { "User-Agent": "Mozilla/5.0 (compatible; BunnList/1.0; +https://bunnlist.com)" };

async function text(fetcher: Fetcher, url: string, ms: number): Promise<string | null> {
  try {
    const res = await fetcher(url, { headers: UA, signal: AbortSignal.timeout(ms), redirect: "follow" });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** schema.org blocks, with @graph flattened. */
function ldBlocks(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]);
      for (const b of Array.isArray(j) ? j : [j]) {
        if (b && typeof b === "object") {
          out.push(b);
          if (Array.isArray(b["@graph"])) out.push(...b["@graph"].filter((g: unknown) => g && typeof g === "object"));
        }
      }
    } catch {
      // A broken block is skipped.
    }
  }
  return out;
}

const asList = (v: unknown): string[] =>
  (Array.isArray(v) ? v : [v]).flatMap((x) => (typeof x === "string" ? [x] : x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string" ? [(x as { url: string }).url] : []));

/** A CDN-resized URL's original ("…/cdn-cgi/image/opts/https://…" → "https://…", "…/cdn-cgi/image/opts/path" → "…/path"). */
function original(url: string): string {
  const nested = url.match(/\/cdn-cgi\/image\/[^/]+\/(https?:\/\/.+)$/);
  return nested ? nested[1] : url.replace(/\/cdn-cgi\/image\/[^/]+\//, "/");
}

/** Candidate product photo URLs on a store page, most likely first. */
export function imageCandidates(html: string, pageUrl: string): string[] {
  const blocks = ldBlocks(html);
  const product = blocks.filter((b) => b["@type"] === "Product").flatMap((b) => asList(b.image));
  const brand = new Set(blocks.filter((b) => b["@type"] === "Organization").flatMap((b) => [...asList(b.logo), ...asList(b.image)]).map(original));
  const og = [...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)].map((m) => m[1]);

  // Salla: uploaded product photos carry their size in the name ("…-994.2x1000-<token>.jpg");
  // the same photo at several sizes shares the token, so keep the biggest of each.
  const salla = new Map<string, { url: string; area: number }>();
  for (const m of html.matchAll(/https:\/\/cdn\.salla\.sa\/[A-Za-z0-9]+\/[^"'\s)]*?-(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)-([A-Za-z0-9]+)\.(?:jpe?g|png|webp)/g)) {
    if (m[0].includes("/cdn-cgi/") || m[0].includes("form-builder")) continue;
    const area = Number(m[1]) * Number(m[2]);
    const prev = salla.get(m[3]);
    if (!prev || prev.area < area) salla.set(m[3], { url: m[0], area });
  }
  // Zid: the store's own uploads (one folder per store); icons are svg.
  const zid = [...html.matchAll(/https:\/\/media\.zid\.store\/(?:cdn-cgi\/image\/[^/]+\/https:\/\/media\.zid\.store\/)?([0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpe?g|png|webp))/g)]
    .map((m) => `https://media.zid.store/${m[1]}`);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...product, ...og, ...[...salla.values()].map((v) => v.url), ...zid]) {
    let url: string;
    try { url = new URL(original(raw), pageUrl).toString(); } catch { continue; }
    if (seen.has(url) || brand.has(url) || /\.svg(\?|$)/i.test(url) || /logo|icon|payment|mada|visa|apple-pay/i.test(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Shopify keeps a product's photos in /products/<handle>.json. */
async function shopifyImages(fetcher: Fetcher, pageUrl: string): Promise<string[]> {
  const base = pageUrl.split(/[?#]/)[0].replace(/\/$/, "");
  const body = await text(fetcher, `${base}.json`, 6000);
  if (!body) return [];
  try {
    const j = JSON.parse(body) as { product?: { images?: { src?: string }[] } };
    return (j.product?.images ?? []).flatMap((i) => (i.src ? [i.src] : []));
  } catch {
    return [];
  }
}

/**
 * Up to `max` product photos from the page, as JPEGs no bigger than 1100px (enough
 * to read a label), skipping small ones (icons, thumbnails). Empty when the page
 * can't be read.
 */
export async function productImages(pageUrl: string, max = 5, fetcher: Fetcher = fetch): Promise<Buffer[]> {
  const html = await text(fetcher, encodeURI(decodeURI(pageUrl)), 8000);
  if (!html) return [];
  let urls = imageCandidates(html, pageUrl);
  if (/cdn\.shopify\.com|Shopify\.shop/.test(html)) urls = [...new Set([...(await shopifyImages(fetcher, pageUrl)), ...urls])];
  const picked = await Promise.all(urls.slice(0, 10).map(async (url) => {
    try {
      const res = await fetcher(url, { headers: UA, signal: AbortSignal.timeout(7000) });
      if (!res.ok) return null;
      const bytes = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(bytes).metadata();
      if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 400) return null;
      return sharp(bytes).rotate().flatten({ background: "#ffffff" })
        .resize(1100, 1100, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    } catch {
      return null;
    }
  }));
  return picked.filter((b): b is Buffer => !!b).slice(0, max);
}
