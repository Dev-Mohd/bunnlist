// A roaster's product text, tidied for the coffee page: the spec labels it runs
// together ("البلد: … الوزن: … المعالجة: …") each on a line, and the store's
// leftovers taken out: brewing recipes, storage advice, the bag's weight, gift
// offers, shop slogans and sentences about the roaster itself. Only removes and
// re-spaces; never adds words.

const LABELS = [
  "اسم المزرعة", "اسم المحصول", "الإيحاءات والانطباع الذوقي", "الانطباع الذوقي", "نوع المعالجة", "طريقة المعالجة",
  "الارتفاع عن سطح البحر", "إيحاءات القهوة", "الاستخدام المقترح", "درجة التحميص", "المزارع", "البلد", "الدولة", "المنشأ",
  "المنطقة", "المزرعة", "المعالجة", "السلالة", "الصنف", "الارتفاع", "الإرتفاع", "الإيحاءات", "الايحاءات", "النكهات",
  "القوام", "الحموضة", "التقييم",
];
const LABEL = new RegExp(`\\s*(${LABELS.join("|")})\\s*:\\s*`, "g");

export function tidyDescription(text: string | null | undefined): string | null {
  if (!text) return null;
  const out = text
    .replace(/ـ/g, "").replace(/﻿/g, "")
    .replace(/(الوصفه|الوصفة|وصفة|وصفه|وصفات|طريقة التحضير|طرق تحضير|كمية القهوة\s*:)\s*(المقترحة|المقترحه|مقترحة|مقترحه|التحضير|تحضير|تقطير|للتقطير|اسبريسو|إسبريسو|للإسبريسو|للاسبريسو|:)?[\s\S]*$/, "")
    .replace(/(وصايا الاستخدام|طريقة الحفظ)[\s\S]*$/, "")
    .replace(/^[^|\n]{0,30}\|\s*/, "")
    .replace(/(اطلب|احصل على|اشتر|اشترِ|تسوق)\s+(عبوتك|محصولك)[^.!\n]*[.!]?/g, "")
    .replace(/(تسوق|تسوّق)( اونلاين| أونلاين| الآن| الان)?\s*/g, "")
    .replace(/(اطلب|اطلبه) (الان|الآن)\s*/g, "")
    .replace(/[.،]?\s*راجع التفاصيل واختر[^.\n]*/g, "")
    .replace(/[.،!]?\s*(جربها|جربه|اطلبها|اطلبه|اشترها|اشتريها) (الآن|الان|اليوم)[^.\n]*/g, "")
    .replace(/[^.\n!]*(تأسست|مقرها|منتجات تعجبكم|اسعار ترضيكم|أسعار ترضيكم|خدمة تليق|الشحن)[^.\n!]*[.!]?/g, "")
    .replace(/\+?\s*\d+\s*كوب هدية/g, "")
    .replace(/(الوزن|وزن الكيس)\s*:\s*[0-9٠-٩.,]+\s*(جم|جرام|غرام|g|كجم|كيلو|kg)?/g, "")
    .replace(LABEL, "\n$1: ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/^[\s.،]+|[\s.،]+$/g, "");
  return out.length >= 15 ? out : null;
}
