const IMAGE_URL_ATTRIBUTES = [
  "src",
  "data-src",
  "data-original",
  "data-image",
  "data-zoom-image",
  "data-master",
];

const PRODUCT_HINTS = [
  "product",
  "gallery",
  "media",
  "coffee",
  "bean",
  "bag",
  "pack",
  "featured",
  "main",
  "og:image",
];

const EXCLUDED_HINTS = [
  "logo",
  "favicon",
  "icon",
  "sprite",
  "placeholder",
  "blank",
  "spinner",
  "loader",
  "tracking",
  "pixel",
  "avatar",
  "payment",
  "badge",
];

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1].trim()) : null;
}

function parseDimension(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveUrl(candidate: string, baseUrl: string) {
  const clean = decodeEntities(candidate).trim();
  if (!clean || clean.startsWith("data:") || clean.startsWith("blob:")) return null;

  try {
    return new URL(clean, baseUrl).toString();
  } catch {
    return null;
  }
}

function srcsetUrls(srcset: string | null) {
  if (!srcset) return [];

  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function isExcludedUrl(url: string) {
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".svg") ||
    lower.includes(".svg?") ||
    lower.includes("/svg/") ||
    EXCLUDED_HINTS.some((hint) => lower.includes(hint))
  );
}

function isLikelyTiny(tag: string) {
  const width = parseDimension(getAttribute(tag, "width"));
  const height = parseDimension(getAttribute(tag, "height"));

  if (width !== null && width <= 80) return true;
  if (height !== null && height <= 80) return true;
  return false;
}

function scoreCandidate(url: string, context: string) {
  const lower = `${url} ${context}`.toLowerCase();
  let score = 0;

  for (const hint of PRODUCT_HINTS) {
    if (lower.includes(hint)) score += 2;
  }

  if (/\.(jpe?g|png|webp)(\?|$)/i.test(url)) score += 2;
  if (lower.includes("thumb")) score -= 1;
  if (lower.includes("small")) score -= 1;

  return score;
}

export function extractProductImages(html: string, baseUrl: string): string[] {
  const candidates: { url: string; score: number; order: number }[] = [];
  let order = 0;

  function addCandidate(rawUrl: string | null, context = "") {
    if (!rawUrl) return;

    const resolved = resolveUrl(rawUrl, baseUrl);
    if (!resolved || isExcludedUrl(resolved)) return;

    candidates.push({
      url: resolved,
      score: scoreCandidate(resolved, context),
      order,
    });
    order += 1;
  }

  const metaRegex = /<meta\b[^>]*(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image)["'][^>]*>/gi;
  for (const match of html.matchAll(metaRegex)) {
    addCandidate(getAttribute(match[0], "content"), "og:image product");
  }

  const reverseMetaRegex = /<meta\b[^>]*content=["'][^"']+["'][^>]*(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image)["'][^>]*>/gi;
  for (const match of html.matchAll(reverseMetaRegex)) {
    addCandidate(getAttribute(match[0], "content"), "og:image product");
  }

  const imgRegex = /<img\b[^>]*>/gi;
  for (const match of html.matchAll(imgRegex)) {
    const tag = match[0];
    if (isLikelyTiny(tag)) continue;

    const context = [
      getAttribute(tag, "alt"),
      getAttribute(tag, "class"),
      getAttribute(tag, "id"),
      getAttribute(tag, "loading"),
    ]
      .filter(Boolean)
      .join(" ");

    if (EXCLUDED_HINTS.some((hint) => context.toLowerCase().includes(hint))) continue;

    for (const attribute of IMAGE_URL_ATTRIBUTES) {
      addCandidate(getAttribute(tag, attribute), context);
    }

    for (const url of srcsetUrls(getAttribute(tag, "srcset") ?? getAttribute(tag, "data-srcset"))) {
      addCandidate(url, context);
    }
  }

  const sourceRegex = /<source\b[^>]*>/gi;
  for (const match of html.matchAll(sourceRegex)) {
    const tag = match[0];
    const context = [getAttribute(tag, "class"), getAttribute(tag, "media")].filter(Boolean).join(" ");
    for (const url of srcsetUrls(getAttribute(tag, "srcset"))) {
      addCandidate(url, context);
    }
  }

  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .filter((candidate) => {
      const key = candidate.url.split("#")[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5)
    .map((candidate) => candidate.url);
}
