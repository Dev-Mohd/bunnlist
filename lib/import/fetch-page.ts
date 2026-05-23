// lib/import/fetch-page.ts
// ============================================================
//  جلب صفحة منتج المحمصة بشكل مسؤول.
//  - يحترم robots.txt
//  - يكشف صفحات الحجب / التحقق البشري
//  - يعيد أخطاء واضحة بدل محاولة التجاوز
// ============================================================

const USER_AGENT = "BunnListImporter/1.0 (+admin import tool; respects robots.txt)";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 3_000_000; // 3MB سقف معقول

export type FetchResult =
  | {
      ok: true;
      html: string;
      httpStatus: number;
      finalUrl: string;
      bytes: number;
    }
  | {
      ok: false;
      reason:
        | "invalid_url"
        | "robots_disallowed"
        | "blocked"
        | "not_found"
        | "server_error"
        | "not_html"
        | "too_large"
        | "timeout"
        | "network_error";
      message: string;
      httpStatus?: number;
    };

// --- التحقق من صحة الرابط وتطبيعه ---
export function normalizeUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // إزالة بارامترات التتبع الشائعة وتوحيد الشكل
    const stripParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
    stripParams.forEach((p) => u.searchParams.delete(p));
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch {
    return null;
  }
}

// --- فحص robots.txt: هل يُسمح بجلب هذا المسار؟ ---
// محلّل بسيط مناسب للـ MVP — يقرأ مجموعة User-agent: *
async function isAllowedByRobots(targetUrl: string): Promise<boolean> {
  try {
    const u = new URL(targetUrl);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timer);
    // لا يوجد robots.txt أو غير قابل للقراءة => نفترض السماح
    if (!res.ok) return true;

    const text = await res.text();
    const path = u.pathname || "/";

    // نقرأ فقط المجموعة الخاصة بـ User-agent: *
    const lines = text.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
    let inStarGroup = false;
    const disallows: string[] = [];

    for (const line of lines) {
      if (!line) continue;
      const [rawKey, ...rest] = line.split(":");
      const key = rawKey.toLowerCase().trim();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        inStarGroup = value === "*";
      } else if (inStarGroup && key === "disallow" && value) {
        disallows.push(value);
      }
    }
    // إذا أي قاعدة Disallow تطابق بداية المسار => ممنوع
    return !disallows.some((rule) => path.startsWith(rule));
  } catch {
    // فشل قراءة robots.txt => نفترض السماح (لا نحجب بسبب خطأ شبكة)
    return true;
  }
}

// --- كاشف صفحات الحجب / التحقق البشري ---
// لا نتجاوزها أبداً — فقط نكشفها ونبلّغ.
function looksBlocked(html: string, httpStatus: number): boolean {
  if (httpStatus === 403 || httpStatus === 429 || httpStatus === 503) return true;
  const lower = html.toLowerCase();
  const signals = [
    "captcha",
    "cf-challenge",
    "verifying you are human",
    "are you a robot",
    "access denied",
    "request blocked",
    "enable javascript and cookies to continue",
  ];
  return signals.some((s) => lower.includes(s));
}

export async function fetchPage(rawUrl: string): Promise<FetchResult> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return { ok: false, reason: "invalid_url", message: "الرابط غير صالح. تأكد أنه يبدأ بـ http:// أو https://" };
  }

  // 1) فحص robots.txt
  const allowed = await isAllowedByRobots(rawUrl);
  if (!allowed) {
    return {
      ok: false,
      reason: "robots_disallowed",
      message: "هذا الموقع يمنع الوصول الآلي لهذه الصفحة عبر ملف robots.txt. لا يمكن استيرادها.",
    };
  }

  // 2) جلب الصفحة
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(rawUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return isAbort
      ? { ok: false, reason: "timeout", message: "انتهت مهلة الاتصال بالموقع. حاول لاحقاً." }
      : { ok: false, reason: "network_error", message: "تعذّر الوصول إلى الموقع. تأكد من الرابط والاتصال." };
  }
  clearTimeout(timer);

  const httpStatus = res.status;

  // 3) معالجة أكواد الأخطاء
  if (httpStatus === 404 || httpStatus === 410) {
    return { ok: false, reason: "not_found", message: "الصفحة غير موجودة على الموقع (404).", httpStatus };
  }
  if (httpStatus >= 500) {
    return { ok: false, reason: "server_error", message: "الموقع يواجه مشكلة حالياً (خطأ خادم).", httpStatus };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (httpStatus < 400 && !contentType.includes("text/html")) {
    return { ok: false, reason: "not_html", message: "الرابط لا يشير إلى صفحة ويب قابلة للقراءة.", httpStatus };
  }

  const html = await res.text();
  const bytes = new TextEncoder().encode(html).length;

  if (bytes > MAX_HTML_BYTES) {
    return { ok: false, reason: "too_large", message: "حجم الصفحة كبير جداً للمعالجة.", httpStatus };
  }

  // 4) كشف الحجب — نبلّغ ولا نتجاوز
  if (looksBlocked(html, httpStatus)) {
    return {
      ok: false,
      reason: "blocked",
      message:
        "الموقع يحجب الوصول الآلي (صفحة تحقق بشري أو منع وصول). لا يمكن استيراد هذه الصفحة — استخدم الإدخال اليدوي بدلاً من ذلك.",
      httpStatus,
    };
  }

  if (httpStatus >= 400) {
    return { ok: false, reason: "blocked", message: "الموقع رفض الطلب.", httpStatus };
  }

  return { ok: true, html, httpStatus, finalUrl: res.url || rawUrl, bytes };
}
