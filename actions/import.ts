// actions/import.ts
// ============================================================
//  Server Actions لميزة "استيراد القهوة".
//  كل دالة تتحقق من أن المستخدم ADMIN قبل أي عملية.
//
//  ملاحظة: تطبيق المراجعة الإلزامية —
//   لا شيء يُكتب في جدول CoffeeLot إلا عبر saveImportedCoffee
//   وبعد أن يضغط الأدمن "حفظ" صراحةً.
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { fetchPage, normalizeUrl } from "@/lib/import/fetch-page";
import { extractText } from "@/lib/import/extract-text";
import { extractCoffee } from "@/lib/import/extract-coffee";
import { checkDuplicate } from "@/lib/import/dedupe";
import type {
  BrewMethod,
  CoffeeImageSource,
  CoffeeImageType,
  CoffeeProcess,
  ImagePermissionStatus,
} from "@prisma/client";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ---- تحويل نص إلى slug صالح للـ URL ----
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w؀-ۿ-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function generateSlug(coffeeName: string, roasterName?: string | null): string {
  const base = roasterName
    ? `${slugify(coffeeName)}-${slugify(roasterName)}`
    : slugify(coffeeName);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "coffee"}-${suffix}`;
}

// ---- تعيين النص إلى CoffeeProcess enum ----
function mapProcess(raw: string | null): CoffeeProcess {
  if (!raw) return "OTHER";
  const s = raw.toLowerCase().replace(/[-_\s]+/g, " ").trim();
  if (s.includes("natural") || s.includes("طبيعي")) return "NATURAL";
  if (s.includes("washed") || s.includes("wet") || s.includes("مغسول")) return "WASHED";
  if (s.includes("honey") || s.includes("عسلي")) return "HONEY";
  if (s.includes("anaerobic") || s.includes("لاهوائي")) return "ANAEROBIC";
  if (s.includes("wet hulled") || s.includes("giling basah")) return "WET_HULLED";
  if (s.includes("carbonic") || s.includes("maceration")) return "CARBONIC_MACERATION";
  if (s.includes("experimental") || s.includes("تجريبي")) return "EXPERIMENTAL";
  return "OTHER";
}

// ---- تعيين مصفوفة نصوص إلى BrewMethod[] enum ----
function mapBrewMethods(raw: string[]): BrewMethod[] {
  const map: Record<string, BrewMethod> = {
    espresso: "ESPRESSO",
    v60: "V60",
    "v-60": "V60",
    chemex: "CHEMEX",
    aeropress: "AEROPRESS",
    "french press": "FRENCH_PRESS",
    frenchpress: "FRENCH_PRESS",
    "french-press": "FRENCH_PRESS",
    "cold brew": "COLD_BREW",
    coldbrew: "COLD_BREW",
    "cold-brew": "COLD_BREW",
  };
  const result: BrewMethod[] = [];
  for (const item of raw) {
    const key = item.toLowerCase().trim();
    if (key in map) {
      result.push(map[key]);
    }
  }
  // إزالة المكررات
  return [...new Set(result)];
}

// ============================================================
//  1) بدء عملية استيراد من رابط
// ============================================================
export async function startImport(rawUrl: string): Promise<ActionResult<{ importJobId: string }>> {
  const session = await requireAdmin();

  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return { ok: false, error: "الرابط غير صالح. تأكد أنه يبدأ بـ http:// أو https://" };
  }

  // أنشئ سجل الوظيفة مبكراً (حتى نسجّل الأخطاء أيضاً)
  const job = await prisma.importJob.create({
    data: {
      sourceUrl: rawUrl.trim(),
      normalizedUrl: normalized,
      status: "PENDING",
      createdById: session.user.id!,
    },
  });

  // اجلب الصفحة
  const fetched = await fetchPage(rawUrl);
  if (!fetched.ok) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "REJECTED",
        errorMessage: `${fetched.reason}: ${fetched.message}`,
        httpStatus: "httpStatus" in fetched ? fetched.httpStatus ?? null : null,
      },
    });
    return { ok: false, error: fetched.message };
  }

  // استخرج النص والبيانات المنظَّمة
  const page = extractText(fetched.html);
  let extraction;
  try {
    extraction = await extractCoffee(page, normalized);
  } catch {
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "REJECTED", errorMessage: "فشل تحليل محتوى الصفحة." },
    });
    return { ok: false, error: "تعذّر تحليل محتوى الصفحة. قد تكون صفحة غير مدعومة." };
  }

  // خزّن النص الخام في سجل الوظيفة (لأغراض التصحيح)
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      httpStatus: fetched.httpStatus,
      rawHtmlSize: fetched.bytes,
      rawText: page.text,
      status: "PENDING",
    },
  });

  const d = extraction.data;
  // أنشئ سجل ImportedCoffee المنظَّم — بحالة PENDING (مراجعة مطلوبة)
  await prisma.importedCoffee.create({
    data: {
      importJobId: job.id,
      status: "PENDING",
      coffeeName: d.coffeeName,
      roasteryName: d.roasteryName,
      originCountry: d.originCountry,
      region: d.region,
      farmName: d.farmName,
      producerName: d.producerName,
      process: d.process,
      variety: d.variety,
      tastingNotes: d.tastingNotes,
      roastLevel: d.roastLevel,
      brewMethods: d.brewMethods,
      price: d.price ?? undefined,
      currency: d.currency ?? "SAR",
      weightGrams: d.weightGrams,
      productUrl: d.productUrl,
      imageUrl: d.imageUrl,
      availability: d.availability,
      descriptionSummary: d.descriptionSummary,
      confidence: extraction.confidence as object,
    },
  });

  revalidatePath("/admin/import");
  return { ok: true, data: { importJobId: job.id } };
}

// ============================================================
//  2) تحديث الحقول بعد مراجعة الأدمن (لا يحفظ في الجدول الرئيسي)
// ============================================================
export async function updateImportedCoffee(
  importedCoffeeId: string,
  fields: Record<string, unknown>
): Promise<ActionResult> {
  await requireAdmin();

  // قائمة بيضاء بالحقول القابلة للتعديل — لا نثق بالمدخلات كما هي
  const allowed = [
    "coffeeName", "roasteryName", "originCountry", "region", "farmName",
    "producerName", "process", "variety", "tastingNotes", "roastLevel",
    "brewMethods", "price", "currency", "weightGrams", "imageUrl",
    "availability", "descriptionSummary",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) data[key] = fields[key];
  }
  // تحديث الحقول ينقل الحالة إلى REVIEWED
  data.status = "REVIEWED";

  await prisma.importedCoffee.update({
    where: { id: importedCoffeeId },
    data,
  });

  revalidatePath("/admin/import");
  return { ok: true, data: null };
}

// ============================================================
//  3) حفظ المحصول المُراجَع في جدول CoffeeLot الرئيسي
//     يتطلب ضغط الأدمن "حفظ" صراحةً — لا حفظ تلقائي.
// ============================================================
export async function saveImportedCoffee(
  importedCoffeeId: string,
  opts: {
    ignoreDuplicate?: boolean;
    imageType?: CoffeeImageType;
    imagePermissionStatus?: ImagePermissionStatus;
    imageSource?: CoffeeImageSource;
    imageCredit?: string | null;
    imageSourceUrl?: string | null;
    imagePermissionNote?: string | null;
  } = {}
): Promise<ActionResult<{ coffeeLotId: string }>> {
  await requireAdmin();

  const imported = await prisma.importedCoffee.findUnique({
    where: { id: importedCoffeeId },
    include: { importJob: true },
  });
  if (!imported) {
    return { ok: false, error: "السجل المستورَد غير موجود." };
  }
  if (imported.status === "SAVED") {
    return { ok: false, error: "هذا المحصول محفوظ مسبقاً." };
  }

  // الحقل الوحيد الأساسي الذي نملكه دائماً: اسم القهوة
  if (!imported.coffeeName) {
    return { ok: false, error: "اسم القهوة مطلوب قبل الحفظ. راجع البيانات وأضفه." };
  }

  // فحص التكرار
  if (!opts.ignoreDuplicate) {
    const dup = await checkDuplicate({
      productUrl: imported.productUrl,
      coffeeName: imported.coffeeName,
      roasteryName: imported.roasteryName,
      originCountry: imported.originCountry,
    });
    if (dup.isDuplicate) {
      return {
        ok: false,
        error: `تكرار محتمل: ${dup.reason} يمكنك التأكيد للحفظ على أي حال.`,
      };
    }
  }

  // ---- ابحث عن المحمصة في الجدول (مطلوبة) ----
  let roasterId: string | null = null;
  if (imported.roasteryName) {
    const roaster = await prisma.roaster.findFirst({
      where: { nameAr: { equals: imported.roasteryName, mode: "insensitive" } },
    });
    roasterId = roaster?.id ?? null;
  }
  if (!roasterId) {
    return {
      ok: false,
      error: `لم يُعثر على محمصة بالاسم "${imported.roasteryName ?? "غير محدد"}" في قاعدة البيانات. أنشئها أولاً من صفحة المحامص ثم أعد المحاولة.`,
    };
  }

  // ---- ابحث عن دولة المنشأ في الجدول (مطلوبة) ----
  let originCountryId: string | null = null;
  if (imported.originCountry) {
    const country = await prisma.originCountry.findFirst({
      where: {
        OR: [
          { nameAr: { equals: imported.originCountry, mode: "insensitive" } },
          { nameEn: { equals: imported.originCountry, mode: "insensitive" } },
        ],
      },
    });
    originCountryId = country?.id ?? null;
  }
  if (!originCountryId) {
    return {
      ok: false,
      error: `لم يُعثر على دولة منشأ بالاسم "${imported.originCountry ?? "غير محدد"}" في قاعدة البيانات. تأكد من وجودها أولاً.`,
    };
  }

  // ---- تعيين حقول enum ----
  const coffeeProcess = mapProcess(imported.process);
  const brewMethods = mapBrewMethods(imported.brewMethods);
  const importedImageUrl = imported.imageUrl?.trim() || null;
  const hasImportedImage = Boolean(importedImageUrl);
  const imagePermissionStatus = hasImportedImage
    ? (opts.imagePermissionStatus ?? "PENDING")
    : "PLACEHOLDER_ONLY";
  const imageType = hasImportedImage ? (opts.imageType ?? "OFFICIAL") : "NONE";
  const imageSource = hasImportedImage ? (opts.imageSource ?? "ROASTERY_WEBSITE") : "PLACEHOLDER";

  // ---- حفظ في جدول CoffeeLot ضمن transaction ----
  try {
    const result = await prisma.$transaction(async (tx) => {
      const coffeeLot = await tx.coffeeLot.create({
        data: {
          slug: generateSlug(imported.coffeeName!, imported.roasteryName),
          name: imported.coffeeName!,
          nameAr: imported.coffeeName!,
          roasterId,
          originCountryId,
          process: coffeeProcess,
          region: imported.region ?? null,
          regionAr: imported.region ?? null,
          farm: imported.farmName ?? null,
          producer: imported.producerName ?? null,
          variety: imported.variety ?? null,
          roastLevel: imported.roastLevel ?? null,
          flavorNotes: imported.tastingNotes,
          recommendedBrewMethods: brewMethods,
          imageUrl: importedImageUrl,
          imageType,
          imagePermissionStatus,
          imageSource,
          imageCredit: hasImportedImage ? opts.imageCredit?.trim() || imported.roasteryName || null : null,
          imageSourceUrl: opts.imageSourceUrl?.trim() || imported.productUrl || null,
          imagePermissionNote: hasImportedImage ? opts.imagePermissionNote?.trim() || null : "Needs Image",
          imageApprovedAt: imagePermissionStatus === "APPROVED" ? new Date() : null,
          description: imported.descriptionSummary ?? null,
          descriptionAr: imported.descriptionSummary ?? null,
          publishedAt: new Date(),
        },
      });

      await tx.importedCoffee.update({
        where: { id: imported.id },
        data: { status: "SAVED", savedCoffeeLotId: coffeeLot.id },
      });
      await tx.importJob.update({
        where: { id: imported.importJobId },
        data: { status: "SAVED" },
      });

      return coffeeLot;
    });

    revalidatePath("/admin/import");
    revalidatePath("/admin/coffees");
    return { ok: true, data: { coffeeLotId: result.id } };
  } catch {
    return { ok: false, error: "فشل حفظ المحصول. راجع الـ logs وتأكد من صحة البيانات." };
  }
}

// ============================================================
//  4) رفض سجل مستورَد
// ============================================================
export async function rejectImportedCoffee(importedCoffeeId: string): Promise<ActionResult> {
  await requireAdmin();

  const imported = await prisma.importedCoffee.findUnique({
    where: { id: importedCoffeeId },
  });
  if (!imported) return { ok: false, error: "السجل غير موجود." };

  await prisma.importedCoffee.update({
    where: { id: importedCoffeeId },
    data: { status: "REJECTED" },
  });
  await prisma.importJob.update({
    where: { id: imported.importJobId },
    data: { status: "REJECTED" },
  });

  revalidatePath("/admin/import");
  return { ok: true, data: null };
}
