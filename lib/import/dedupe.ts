// lib/import/dedupe.ts
// ============================================================
//  كشف التكرار قبل حفظ محصول مستورَد في الجدول الرئيسي.
//  يفحص: رابط المنتج، اسم القهوة، اسم المحمصة، دولة المنشأ.
// ============================================================

import { prisma } from "@/lib/prisma";

export interface DuplicateMatch {
  isDuplicate: boolean;
  reason: string | null;
  existingCoffeeLotId: string | null;
}

// تطبيع نصي بسيط للمقارنة (حروف صغيرة، إزالة مسافات زائدة)
function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export async function checkDuplicate(input: {
  productUrl: string | null;
  coffeeName: string | null;
  roasteryName: string | null;
  originCountry: string | null;
}): Promise<DuplicateMatch> {
  // 1) تطابق رابط المنتج — أقوى إشارة
  if (input.productUrl) {
    const job = await prisma.importJob.findFirst({
      where: {
        normalizedUrl: norm(input.productUrl),
        status: "SAVED",
        importedCoffee: { savedCoffeeLotId: { not: null } },
      },
      include: { importedCoffee: true },
    });
    if (job?.importedCoffee?.savedCoffeeLotId) {
      return {
        isDuplicate: true,
        reason: "تم استيراد هذا الرابط وحفظه مسبقاً.",
        existingCoffeeLotId: job.importedCoffee.savedCoffeeLotId,
      };
    }
  }

  // 2) تطابق الاسم + المحمصة + المنشأ في جدول CoffeeLot الرئيسي
  //    ملاحظة: عدّل أسماء الحقول إذا كانت مختلفة في schema لديك.
  if (input.coffeeName && input.roasteryName) {
    const candidates = await prisma.coffeeLot.findMany({
      where: {
        roaster: { nameAr: { equals: input.roasteryName, mode: "insensitive" } },
      },
      include: { roaster: true, originCountry: true },
      take: 50,
    });

    const match = candidates.find((c) => {
      const sameName = norm(c.nameAr) === norm(input.coffeeName);
      const sameOrigin =
        !input.originCountry ||
        norm(c.originCountry?.nameAr) === norm(input.originCountry) ||
        norm(c.originCountry?.nameEn) === norm(input.originCountry);
      return sameName && sameOrigin;
    });

    if (match) {
      return {
        isDuplicate: true,
        reason: "يوجد محصول بنفس الاسم والمحمصة والمنشأ في قاعدة البيانات.",
        existingCoffeeLotId: match.id,
      };
    }
  }

  return { isDuplicate: false, reason: null, existingCoffeeLotId: null };
}
