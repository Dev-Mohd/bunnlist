const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

export type ImageUrlValidationResult = {
  valid: boolean;
  cleanedUrl: string;
  reason?: string;
};

export function cleanImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const parsed = new URL(trimmed);
  if (parsed.protocol !== "https:") {
    throw new Error("رابط الصورة يجب أن يبدأ بـ https.");
  }

  for (const param of Array.from(parsed.searchParams.keys())) {
    if (TRACKING_PARAMS.has(param.toLowerCase())) {
      parsed.searchParams.delete(param);
    }
  }

  parsed.hash = "";
  return parsed.toString();
}

function hasImageExtension(url: URL) {
  const extension = url.pathname.split(".").pop()?.toLowerCase();
  return extension ? IMAGE_EXTENSIONS.has(extension) : false;
}

function isBlockedImageHost(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return (
    hostname.includes("instagram.com") ||
    hostname.includes("l.instagram.com") ||
    hostname.includes("google.com") ||
    hostname.includes("googleusercontent.com/url")
  );
}

async function fetchImageHeaders(url: string) {
  const headResponse = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
    signal: AbortSignal.timeout(5000),
  });

  if (headResponse.ok) return headResponse;

  return fetch(url, {
    method: "GET",
    headers: { Range: "bytes=0-0" },
    redirect: "follow",
    signal: AbortSignal.timeout(5000),
  });
}

export async function validateImageUrl(url: string): Promise<ImageUrlValidationResult> {
  let cleanedUrl: string;
  let parsed: URL;

  try {
    cleanedUrl = cleanImageUrl(url);
    parsed = new URL(cleanedUrl);
  } catch (error) {
    return {
      valid: false,
      cleanedUrl: url.trim(),
      reason: error instanceof Error ? error.message : "رابط الصورة غير صحيح.",
    };
  }

  if (!cleanedUrl) {
    return { valid: false, cleanedUrl, reason: "أدخل رابط صورة أولاً." };
  }

  if (isBlockedImageHost(parsed)) {
    return {
      valid: false,
      cleanedUrl,
      reason: "استخدم رابط ملف الصورة المباشر، وليس صفحة إنستغرام أو رابط تحويل.",
    };
  }

  try {
    const response = await fetchImageHeaders(cleanedUrl);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

    if (!response.ok) {
      return { valid: false, cleanedUrl, reason: "تعذر الوصول إلى رابط الصورة." };
    }

    if (contentType.startsWith("image/")) {
      return { valid: true, cleanedUrl };
    }

    if (!hasImageExtension(parsed)) {
      return {
        valid: false,
        cleanedUrl,
        reason: "الرابط لا يبدو كرابط صورة مباشر بصيغة jpg أو png أو webp أو avif.",
      };
    }

    if (contentType && !contentType.startsWith("image/")) {
      return { valid: false, cleanedUrl, reason: "الرابط لا يرجع ملف صورة." };
    }

    return { valid: true, cleanedUrl };
  } catch {
    return {
      valid: false,
      cleanedUrl,
      reason: "تعذر التحقق من رابط الصورة. تأكد أن الرابط مباشر ويعمل.",
    };
  }
}
