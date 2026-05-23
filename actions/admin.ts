"use server";

import { revalidatePath } from "next/cache";
import { ImagePermissionStatus } from "@prisma/client";
import type {
  BrewMethod,
  CoffeeImageSource,
  CoffeeImageType,
  CoffeeProcess,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { coffeeFormSchema, type CoffeeFormValues } from "@/lib/validations/coffee";

export type AdminActionResult =
  | { success: true; slug: string }
  | { success: false; error: string };

export type DeleteActionResult =
  | { success: true }
  | { success: false; error: string };

export type CoffeeLotFull = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  roasterId: string;
  originCountryId: string;
  region: string | null;
  regionAr: string | null;
  process: CoffeeProcess;
  variety: string | null;
  altitudeMeters: number | null;
  flavorNotes: string[];
  recommendedBrewMethods: BrewMethod[];
  description: string | null;
  descriptionAr: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  imageType: CoffeeImageType;
  imagePermissionStatus: ImagePermissionStatus;
  imageSource: CoffeeImageSource;
  imageCredit: string | null;
  imageSourceUrl: string | null;
  imagePermissionNote: string | null;
  imageApprovedAt: Date | null;
  publishedAt: Date | null;
};

export type AdminCoffeeFilter = "no-image" | "no-reviews" | "low-rating" | "";

export type CoffeeLotAdminListItem = {
  id: string;
  slug: string;
  nameAr: string;
  imagePath: string | null;
  imageUrl: string | null;
  imageType: CoffeeImageType;
  imagePermissionStatus: ImagePermissionStatus;
  reviewCount: number;
  averageRating: number;
  publishedAt: Date | null;
  updatedAt: Date;
  roaster: { nameAr: string };
};

export async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "coffee-lot";

  let slug = base;
  let counter = 1;

  for (;;) {
    const existing = await prisma.coffeeLot.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}

export async function createCoffeeLot(input: CoffeeFormValues): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = coffeeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة." };
  }

  const d = parsed.data;

  try {
    const slug = await generateUniqueSlug(d.name);

    await prisma.coffeeLot.create({
      data: {
        slug,
        name: d.name,
        nameAr: d.nameAr,
        roasterId: d.roasterId,
        originCountryId: d.originCountryId,
        region: d.region || null,
        regionAr: d.regionAr || null,
        process: d.process,
        variety: d.variety || null,
        altitudeMeters: d.altitudeMeters ?? null,
        flavorNotes: d.flavorNotes,
        recommendedBrewMethods: d.recommendedBrewMethods,
        description: d.description || null,
        descriptionAr: d.descriptionAr || null,
        imagePath: d.imagePath || null,
        imageUrl: d.imageUrl || null,
        imageType: d.imageType,
        imagePermissionStatus: d.imagePermissionStatus,
        imageSource: d.imageSource,
        imageCredit: d.imageCredit || null,
        imageSourceUrl: d.imageSourceUrl || null,
        imagePermissionNote: d.imagePermissionNote || null,
        imageApprovedAt:
          d.imagePermissionStatus === "APPROVED" ? (d.imageApprovedAt ?? new Date()) : null,
        publishedAt: d.published ? new Date() : null,
      },
    });

    revalidatePath("/coffees");
    revalidatePath("/admin/coffees");

    return { success: true, slug };
  } catch (error) {
    console.error(error);
    return { success: false, error: "تعذر إنشاء المحصول. حاول مرة أخرى." };
  }
}

export async function updateCoffeeLot(
  id: string,
  input: CoffeeFormValues,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = coffeeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة." };
  }

  const d = parsed.data;

  try {
    const current = await prisma.coffeeLot.findUnique({
      where: { id },
      select: { id: true, slug: true, name: true, publishedAt: true },
    });

    if (!current) {
      return { success: false, error: "المحصول غير موجود." };
    }

    const slug =
      current.name === d.name
        ? current.slug
        : await generateUniqueSlug(d.name, id);

    await prisma.coffeeLot.update({
      where: { id },
      data: {
        slug,
        name: d.name,
        nameAr: d.nameAr,
        roasterId: d.roasterId,
        originCountryId: d.originCountryId,
        region: d.region || null,
        regionAr: d.regionAr || null,
        process: d.process,
        variety: d.variety || null,
        altitudeMeters: d.altitudeMeters ?? null,
        flavorNotes: d.flavorNotes,
        recommendedBrewMethods: d.recommendedBrewMethods,
        description: d.description || null,
        descriptionAr: d.descriptionAr || null,
        imagePath: d.imagePath || null,
        imageUrl: d.imageUrl || null,
        imageType: d.imageType,
        imagePermissionStatus: d.imagePermissionStatus,
        imageSource: d.imageSource,
        imageCredit: d.imageCredit || null,
        imageSourceUrl: d.imageSourceUrl || null,
        imagePermissionNote: d.imagePermissionNote || null,
        imageApprovedAt:
          d.imagePermissionStatus === "APPROVED" ? (d.imageApprovedAt ?? new Date()) : null,
        publishedAt: d.published ? (current.publishedAt ?? new Date()) : null,
      },
    });

    revalidatePath("/coffees");
    revalidatePath(`/coffees/${slug}`);
    revalidatePath("/admin/coffees");

    return { success: true, slug };
  } catch (error) {
    console.error(error);
    return { success: false, error: "تعذر تحديث المحصول. حاول مرة أخرى." };
  }
}

export async function deleteCoffeeLot(id: string): Promise<DeleteActionResult> {
  await requireAdmin();

  try {
    const lot = await prisma.coffeeLot.findUnique({
      where: { id },
      select: { id: true, slug: true, _count: { select: { reviews: true } } },
    });

    if (!lot) {
      return { success: false, error: "المحصول غير موجود." };
    }

    if (lot._count.reviews > 0) {
      return { success: false, error: "لا يمكن حذف محصول له تقييمات." };
    }

    await prisma.coffeeLot.delete({ where: { id } });

    revalidatePath("/coffees");
    revalidatePath("/admin/coffees");

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "تعذر حذف المحصول. حاول مرة أخرى." };
  }
}

export async function getCoffeeLotForEdit(id: string): Promise<CoffeeLotFull | null> {
  await requireAdmin();

  return prisma.coffeeLot.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      nameAr: true,
      roasterId: true,
      originCountryId: true,
      region: true,
      regionAr: true,
      process: true,
      variety: true,
      altitudeMeters: true,
      flavorNotes: true,
      recommendedBrewMethods: true,
      description: true,
      descriptionAr: true,
      imagePath: true,
      imageUrl: true,
      imageType: true,
      imagePermissionStatus: true,
      imageSource: true,
      imageCredit: true,
      imageSourceUrl: true,
      imagePermissionNote: true,
      imageApprovedAt: true,
      publishedAt: true,
    },
  });
}

export async function getAllCoffeeLotsAdmin(
  options: { filter?: string } = {},
): Promise<CoffeeLotAdminListItem[]> {
  await requireAdmin();

  const { filter } = options;

  const where: Prisma.CoffeeLotWhereInput =
    filter === "no-image"
      ? {
          OR: [
            { imageUrl: null },
            { imagePermissionStatus: { not: ImagePermissionStatus.APPROVED } },
          ],
        }
      : filter === "no-reviews"
        ? { reviewCount: 0 }
        : filter === "low-rating"
          ? { reviewCount: { gt: 0 }, averageRating: { lt: 3 } }
          : filter === "drafts"
            ? { publishedAt: null }
            : {};

  const lots = await prisma.coffeeLot.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      nameAr: true,
      imagePath: true,
      imageUrl: true,
      imageType: true,
      imagePermissionStatus: true,
      reviewCount: true,
      averageRating: true,
      publishedAt: true,
      updatedAt: true,
      roaster: { select: { nameAr: true } },
    },
  });

  return lots.map((lot) => ({
    ...lot,
    averageRating: Number(lot.averageRating),
  }));
}
