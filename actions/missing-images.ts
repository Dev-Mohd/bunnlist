"use server";

import { revalidatePath } from "next/cache";
import { CoffeeImageSource, CoffeeImageType, ImagePermissionStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { cleanImageUrl, validateImageUrl } from "@/lib/image-url";
import { prisma } from "@/lib/prisma";

const imagePermissionValues = Object.values(ImagePermissionStatus) as [
  ImagePermissionStatus,
  ...ImagePermissionStatus[],
];
const imageSourceValues = Object.values(CoffeeImageSource) as [
  CoffeeImageSource,
  ...CoffeeImageSource[],
];
const BLACK_KNIGHT_PERMISSION_NOTE =
  "Official product image usage approved by Black Knight on 2026-05-16.";
const BLACK_KNIGHT_APPROVED_AT = new Date("2026-05-16T00:00:00.000Z");

const updateImageSchema = z.object({
  coffeeLotId: z.string().min(1),
  imageUrl: z.string().url("رابط الصورة غير صحيح").or(z.literal("")).optional(),
  imagePermissionStatus: z.enum(imagePermissionValues),
  imageSource: z.enum(imageSourceValues).optional(),
  imageSourceUrl: z.string().url("رابط مصدر الصورة غير صحيح").or(z.literal("")).optional(),
  imageCredit: z.string().max(200).optional(),
  imagePermissionNote: z.string().max(1000).optional(),
});

const bulkApproveSchema = z.object({
  roasterId: z.string().min(1, "اختر محمصة أولاً."),
});

export type MissingImageFilters = {
  roasterId?: string;
  permissionStatus?: ImagePermissionStatus | "";
  hasSourceUrl?: "yes" | "no" | "";
  blackKnightOnly?: boolean;
};

export type MissingImageLot = {
  id: string;
  slug: string;
  nameAr: string;
  processLabel: string | null;
  process: string;
  imageUrl: string | null;
  imagePermissionStatus: ImagePermissionStatus;
  imageCredit: string | null;
  imagePermissionNote: string | null;
  imageSource: CoffeeImageSource;
  imageSourceUrl: string | null;
  productSourceUrl: string | null;
  isBlackKnight: boolean;
  roaster: { id: string; name: string; nameAr: string };
  originCountry: { nameAr: string };
};

export type MissingImageRoaster = {
  id: string;
  nameAr: string;
};

export type ImageActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export type ValidateImageActionResult =
  | { success: true; valid: boolean; cleanedUrl: string; reason?: string }
  | { success: false; error: string };

function isBlackKnightName(value: string | null | undefined) {
  const normalized = value?.toLowerCase() ?? "";
  return normalized.includes("black knight") || normalized.includes("بلاك نايت");
}

function blackKnightWhere(): Prisma.CoffeeLotWhereInput {
  return {
    roaster: {
      OR: [
        { name: { contains: "Black Knight", mode: "insensitive" } },
        { nameAr: { contains: "Black Knight", mode: "insensitive" } },
        { name: { contains: "بلاك نايت", mode: "insensitive" } },
        { nameAr: { contains: "بلاك نايت", mode: "insensitive" } },
      ],
    },
  };
}

function missingImageWhere(filters: MissingImageFilters = {}): Prisma.CoffeeLotWhereInput {
  const hasSourceUrl =
    filters.hasSourceUrl === "yes"
      ? {
          OR: [
            { imageSourceUrl: { not: null } },
            { importedFrom: { some: { productUrl: { not: null } } } },
          ],
        }
      : filters.hasSourceUrl === "no"
        ? {
            AND: [
              { imageSourceUrl: null },
              { importedFrom: { none: { productUrl: { not: null } } } },
            ],
          }
        : {};

  return {
    AND: [
      {
        OR: [
          { imageUrl: null },
          { imagePermissionStatus: { not: ImagePermissionStatus.APPROVED } },
        ],
      },
      filters.roasterId ? { roasterId: filters.roasterId } : {},
      filters.permissionStatus ? { imagePermissionStatus: filters.permissionStatus } : {},
      filters.blackKnightOnly ? blackKnightWhere() : {},
      hasSourceUrl,
    ],
  };
}

export async function getMissingImageAdminData(filters: MissingImageFilters = {}): Promise<{
  lots: MissingImageLot[];
  roasters: MissingImageRoaster[];
}> {
  await requireAdmin();

  const [lots, roasters] = await Promise.all([
    prisma.coffeeLot.findMany({
      where: missingImageWhere(filters),
      orderBy: [{ roaster: { nameAr: "asc" } }, { nameAr: "asc" }],
      select: {
        id: true,
        slug: true,
        nameAr: true,
        process: true,
        processLabel: true,
        imageUrl: true,
        imagePermissionStatus: true,
        imageCredit: true,
        imagePermissionNote: true,
        imageSource: true,
        imageSourceUrl: true,
        roaster: { select: { id: true, name: true, nameAr: true } },
        originCountry: { select: { nameAr: true } },
        importedFrom: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            productUrl: true,
            importJob: { select: { sourceUrl: true } },
          },
        },
      },
    }),
    prisma.roaster.findMany({
      where: { coffeeLots: { some: missingImageWhere({}) } },
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
  ]);

  return {
    lots: lots.map((lot) => ({
      ...lot,
      process: lot.process,
      isBlackKnight:
        isBlackKnightName(lot.roaster.name) || isBlackKnightName(lot.roaster.nameAr),
      productSourceUrl:
        lot.imageSourceUrl ??
        lot.importedFrom[0]?.productUrl ??
        lot.importedFrom[0]?.importJob.sourceUrl ??
        null,
    })),
    roasters,
  };
}

export async function updateMissingImage(input: unknown): Promise<ImageActionResult> {
  await requireAdmin();

  const parsed = updateImageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات الصورة غير صحيحة." };
  }

  const data = parsed.data;
  let cleanedImageUrl: string | null = null;

  try {
    cleanedImageUrl = data.imageUrl ? cleanImageUrl(data.imageUrl) : null;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "رابط الصورة غير صحيح.",
    };
  }

  const validation = cleanedImageUrl ? await validateImageUrl(cleanedImageUrl) : null;

  if (
    data.imagePermissionStatus === ImagePermissionStatus.APPROVED &&
    (!validation || !validation.valid)
  ) {
    return {
      success: false,
      error: validation?.reason ?? "لا يمكن اعتماد الصورة قبل التحقق من الرابط.",
    };
  }

  try {
    const lot = await prisma.coffeeLot.findUnique({
      where: { id: data.coffeeLotId },
      select: {
        imageSourceUrl: true,
        roaster: { select: { name: true, nameAr: true } },
        importedFrom: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            productUrl: true,
            importJob: { select: { sourceUrl: true } },
          },
        },
      },
    });

    if (!lot) {
      return { success: false, error: "المحصول غير موجود." };
    }

    const isBlackKnight =
      isBlackKnightName(lot.roaster.name) || isBlackKnightName(lot.roaster.nameAr);
    const imagePermissionStatus =
      isBlackKnight && cleanedImageUrl && data.imagePermissionStatus === ImagePermissionStatus.APPROVED
        ? ImagePermissionStatus.APPROVED
        : data.imagePermissionStatus;
    const permissionApproved = imagePermissionStatus === ImagePermissionStatus.APPROVED;
    const productSourceUrl =
      data.imageSourceUrl?.trim() ||
      lot.imageSourceUrl ||
      lot.importedFrom[0]?.productUrl ||
      lot.importedFrom[0]?.importJob.sourceUrl ||
      null;

    await prisma.coffeeLot.update({
      where: { id: data.coffeeLotId },
      data: {
        imageUrl: cleanedImageUrl,
        imageType: cleanedImageUrl ? CoffeeImageType.OFFICIAL : CoffeeImageType.NONE,
        imageSource: cleanedImageUrl
          ? (data.imageSource ?? CoffeeImageSource.ROASTERY_WEBSITE)
          : CoffeeImageSource.PLACEHOLDER,
        imagePermissionStatus,
        imageCredit:
          isBlackKnight && cleanedImageUrl && permissionApproved
            ? "Black Knight"
            : data.imageCredit?.trim() || null,
        imageSourceUrl: productSourceUrl,
        imagePermissionNote:
          isBlackKnight && cleanedImageUrl && permissionApproved
            ? BLACK_KNIGHT_PERMISSION_NOTE
            : data.imagePermissionNote?.trim() || null,
        imageApprovedAt: permissionApproved
          ? isBlackKnight
            ? BLACK_KNIGHT_APPROVED_AT
            : new Date()
          : null,
      },
    });

    revalidatePath("/admin/missing-images");
    revalidatePath("/coffees");
    return { success: true, message: "تم حفظ بيانات الصورة." };
  } catch {
    return { success: false, error: "تعذر حفظ بيانات الصورة." };
  }
}

export async function validateMissingImageUrl(url: string): Promise<ValidateImageActionResult> {
  await requireAdmin();

  const result = await validateImageUrl(url);
  return { success: true, ...result };
}

export async function approveMissingImagesByRoastery(input: unknown): Promise<ImageActionResult> {
  await requireAdmin();

  const parsed = bulkApproveSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "اختر محمصة صحيحة." };
  }

  try {
    const result = await prisma.coffeeLot.updateMany({
      where: missingImageWhere({ roasterId: parsed.data.roasterId }),
      data: {
        imagePermissionStatus: ImagePermissionStatus.APPROVED,
        imageSource: CoffeeImageSource.ROASTERY_WEBSITE,
        imageApprovedAt: new Date(),
      },
    });

    revalidatePath("/admin/missing-images");
    revalidatePath("/coffees");
    return { success: true, message: `تم اعتماد إذن الصور لـ ${result.count} محصول.` };
  } catch {
    return { success: false, error: "تعذر تنفيذ الاعتماد الجماعي." };
  }
}
