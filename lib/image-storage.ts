import { CoffeeImageType, ImagePermissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateImageUrl } from "@/lib/image-url";

type StoreApprovedImageResult =
  | { success: true; storedImageUrl: string }
  | { success: false; error: string };

const STORAGE_DISABLED_MESSAGE =
  "Image storage sync is disabled. Set ENABLE_IMAGE_STORAGE_SYNC=true and configure a storage adapter before running it.";

function isStorageSyncEnabled() {
  return process.env.ENABLE_IMAGE_STORAGE_SYNC === "true";
}

async function storeImageBytes(_input: {
  coffeeLotId: string;
  imageUrl: string;
  contentType: string;
  bytes: ArrayBuffer;
}): Promise<{ storedImageUrl: string }> {
  void _input;
  throw new Error(
    "No image storage adapter configured. Add Cloudflare R2 or Supabase Storage implementation before enabling this workflow.",
  );
}

export async function storeApprovedImage(
  imageUrl: string,
  coffeeLotId: string,
  options: { overwrite?: boolean } = {},
): Promise<StoreApprovedImageResult> {
  if (!isStorageSyncEnabled()) {
    return { success: false, error: STORAGE_DISABLED_MESSAGE };
  }

  const lot = await prisma.coffeeLot.findUnique({
    where: { id: coffeeLotId },
    select: {
      id: true,
      imagePermissionStatus: true,
      storedImageUrl: true,
    },
  });

  if (!lot) {
    return { success: false, error: "Coffee lot not found." };
  }

  if (lot.imagePermissionStatus !== ImagePermissionStatus.APPROVED) {
    return { success: false, error: "Image permission must be approved before storing." };
  }

  if (lot.storedImageUrl && !options.overwrite) {
    return {
      success: false,
      error: "Stored image already exists. Admin confirmation is required before overwriting.",
    };
  }

  const validation = await validateImageUrl(imageUrl);
  if (!validation.valid) {
    return { success: false, error: validation.reason ?? "Image URL is invalid." };
  }

  const response = await fetch(validation.cleanedUrl);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
    return { success: false, error: "Could not download a valid image file." };
  }

  const bytes = await response.arrayBuffer();

  // Future note: convert to WebP here when a server-side image pipeline is added.
  const stored = await storeImageBytes({
    coffeeLotId,
    imageUrl: validation.cleanedUrl,
    contentType,
    bytes,
  });

  await prisma.coffeeLot.update({
    where: { id: coffeeLotId },
    data: {
      originalImageUrl: validation.cleanedUrl,
      storedImageUrl: stored.storedImageUrl,
      imageUrl: validation.cleanedUrl,
      imageType: CoffeeImageType.OFFICIAL,
      imageStorageProvider: process.env.IMAGE_STORAGE_PROVIDER ?? "unconfigured",
      imageStoredAt: new Date(),
    },
  });

  return { success: true, storedImageUrl: stored.storedImageUrl };
}
