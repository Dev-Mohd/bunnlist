// lib/import/extract-text.ts
// ============================================================
//  استخراج نص نظيف قابل للقراءة من HTML.
//  لا اعتماد على مكتبات خارجية ثقيلة — مناسب للـ MVP.
//  (لو احتجت دقة أعلى لاحقاً، يمكن استبدالها بـ @mozilla/readability)
// ============================================================

export interface ExtractedPage {
  text: string;        // نص نظيف للتمرير إلى خطوة الاستخراج
  title: string | null;
  metaImage: string | null;   // og:image إن وُجدت
  jsonLd: unknown[];          // كتل JSON-LD المهيكلة (مفيدة جداً للمنتجات)
  rawHtml: string;             // HTML الأصلي لاستخراج صور المنتج المرشّحة
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

export function extractText(html: string): ExtractedPage {
  // 1) العنوان
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : null;

  // 2) صورة og:image (مرشّح لرابط الصورة)
  const ogImage =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const metaImage = ogImage ? ogImage[1].trim() : null;

  // 3) كتل JSON-LD — كثير من المتاجر تضع بيانات المنتج هنا (الأدق)
  const jsonLd: unknown[] = [];
  const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = ldRegex.exec(html)) !== null) {
    try {
      jsonLd.push(JSON.parse(m[1].trim()));
    } catch {
      // كتلة JSON-LD تالفة — نتجاهلها بهدوء
    }
  }

  // 4) نص الجسم النظيف
  let body = html;
  // إزالة العناصر غير المرئية
  body = body.replace(/<script[\s\S]*?<\/script>/gi, " ");
  body = body.replace(/<style[\s\S]*?<\/style>/gi, " ");
  body = body.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  body = body.replace(/<!--[\s\S]*?-->/g, " ");
  body = body.replace(/<head[\s\S]*?<\/head>/gi, " ");
  body = body.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  body = body.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  // تحويل الوسوم إلى مسافات
  body = body.replace(/<[^>]+>/g, " ");
  body = decodeEntities(body);
  // ضغط المسافات
  body = body.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

  return { text: body.slice(0, 8000), title, metaImage, jsonLd, rawHtml: html };
}
