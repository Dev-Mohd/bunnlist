import { createClient } from "@supabase/supabase-js";
import { ImagePermissionStatus } from "@prisma/client";
import sharp from "sharp";
import { removeImageBackground } from "@/lib/background-removal";
import { prisma } from "@/lib/prisma";
import { getCoffeeImageUrl } from "@/lib/storage";

const BUCKET_NAME = "coffee-images";
const OUTPUT_SIZE = 1200;
const PRODUCT_MAX_WIDTH = Math.round(OUTPUT_SIZE * 0.92);
const PRODUCT_MAX_HEIGHT = Math.round(OUTPUT_SIZE * 0.92);
const NORMALIZED_IMAGE_CONTENT_TYPE = "image/webp";
const WEBP_QUALITY = 90;
const PACKSHOT_TEMPLATE_BACKGROUND = "#BD3DA6";

type NormalizationMode = "packshot" | "source-card";

type CoffeeImageBefore = {
  id: string;
  slug: string;
  nameAr: string;
  imageUrl: string | null;
  imagePath: string | null;
  imagePermissionStatus: ImagePermissionStatus;
  originalImageUrl: string | null;
  storedImageUrl: string | null;
  imageStorageProvider: string | null;
  imageStoredAt: Date | null;
};

function printUsage() {
  console.error(
    [
      "Usage:",
      "  ALLOW_IMAGE_NORMALIZATION=true npx tsx scripts/normalize-coffee-image.ts <coffee-slug> --mode packshot",
      "  ALLOW_IMAGE_NORMALIZATION=true npx tsx scripts/normalize-coffee-image.ts <coffee-slug> --mode source-card",
      "",
      "Modes:",
      "  packshot    Uses the configured background-removal provider for real product/bag photos.",
      "  source-card Preserves source-designed card artwork and only trims outer whitespace.",
    ].join("\n"),
  );
}

function formatValue(value: Date | string | null) {
  if (value instanceof Date) return value.toISOString();
  return value ?? "(null)";
}

function printLot(label: string, lot: Omit<CoffeeImageBefore, "id" | "imagePermissionStatus">) {
  console.log(label);
  console.table({
    slug: lot.slug,
    nameAr: lot.nameAr,
    imageUrl: formatValue(lot.imageUrl),
    imagePath: formatValue(lot.imagePath),
    originalImageUrl: formatValue(lot.originalImageUrl),
    storedImageUrl: formatValue(lot.storedImageUrl),
    imageStorageProvider: formatValue(lot.imageStorageProvider),
    imageStoredAt: formatValue(lot.imageStoredAt),
  });
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function getCliMode(args: string[]): NormalizationMode | null {
  const modeIndex = args.indexOf("--mode");
  const inlineMode = args.find((arg) => arg.startsWith("--mode="))?.split("=")[1];
  const mode = inlineMode ?? (modeIndex >= 0 ? args[modeIndex + 1] : undefined);

  if (mode === "packshot" || mode === "source-card") {
    return mode;
  }

  return null;
}

function getSlugArg(args: string[]) {
  return args.find((arg, index) => {
    if (arg.startsWith("--")) return false;
    return args[index - 1] !== "--mode";
  })?.trim();
}

function getStorageProvider(mode: NormalizationMode) {
  return mode === "source-card"
    ? "supabase-normalized-webp-source-card"
    : "supabase-normalized-webp";
}

function getSupabaseBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!rawUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is required.");
  }

  const normalized = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  return normalized;
}

function getSourceImageUrl(lot: Pick<CoffeeImageBefore, "imageUrl" | "imagePath" | "imagePermissionStatus">) {
  if (lot.imageUrl && lot.imagePermissionStatus === ImagePermissionStatus.APPROVED) {
    return {
      sourceUrl: lot.imageUrl,
      sourceKind: "approved imageUrl",
    };
  }

  if (lot.imagePath) {
    const storageUrl = getCoffeeImageUrl(lot.imagePath);
    if (!storageUrl.startsWith("/")) {
      return {
        sourceUrl: storageUrl,
        sourceKind: "imagePath storage fallback",
      };
    }
  }

  return null;
}

function normalizeSlugForPath(slug: string) {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "coffee";
}

async function downloadSourceImage(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Could not download source image (${response.status}): ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Source URL did not return an image. Content-Type: ${contentType}`);
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType,
  };
}

async function buildNormalizedWebp(inputImageBytes: ArrayBuffer, mode: NormalizationMode) {
  // WebP is the production normalized format. Packshots use transparent output
  // from background removal; source cards export only the preserved card asset.
  const inputBuffer: Buffer<ArrayBufferLike> = Buffer.from(inputImageBytes);
  const originalMetadata = await sharp(inputBuffer).metadata();
  console.log(
    `${mode === "packshot" ? "Removed-background" : "Source-card"} image size: ${
      originalMetadata.width ?? "unknown"
    }x${originalMetadata.height ?? "unknown"}`,
  );

  let trimmedBuffer: Buffer<ArrayBufferLike> = inputBuffer;
  try {
    trimmedBuffer = await sharp(inputBuffer).trim().png().toBuffer();
  } catch (error) {
    console.warn(
      `Warning: could not trim outer padding; continuing with untrimmed image. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const trimmedMetadata = await sharp(trimmedBuffer).metadata();
  console.log(
    `Trimmed image size: ${trimmedMetadata.width ?? "unknown"}x${trimmedMetadata.height ?? "unknown"}`,
  );

  if (mode === "source-card") {
    const output = await sharp(trimmedBuffer)
      .webp({ quality: WEBP_QUALITY, alphaQuality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    console.log(`Final source-card output size: ${output.info.width}x${output.info.height}`);
    return output.data;
  }

  const resized = await sharp(trimmedBuffer)
    .resize({
      width: PRODUCT_MAX_WIDTH,
      height: PRODUCT_MAX_HEIGHT,
      fit: "inside",
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  console.log(`Final resized visual size: ${resized.info.width}x${resized.info.height}`);
  console.log(`Final template background: ${PACKSHOT_TEMPLATE_BACKGROUND}`);

  return sharp({
    create: {
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      channels: 4,
      background: PACKSHOT_TEMPLATE_BACKGROUND,
    },
  })
    .composite([{ input: resized.data, gravity: "center" }])
    .webp({ quality: WEBP_QUALITY, alphaQuality: WEBP_QUALITY })
    .toBuffer();
}

async function uploadNormalizedImage(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  path: string;
  imageBytes: Buffer;
}) {
  const supabase = createClient(input.supabaseUrl, input.serviceRoleKey);

  const { error: bucketReadError } = await supabase.storage.getBucket(BUCKET_NAME);
  if (bucketReadError) {
    const { error: bucketCreateError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    });

    if (bucketCreateError) {
      throw new Error(`Could not prepare storage bucket: ${bucketCreateError.message}`);
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(input.path, input.imageBytes, {
      cacheControl: "31536000",
      contentType: NORMALIZED_IMAGE_CONTENT_TYPE,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Could not upload normalized image: ${uploadError.message}`);
  }

  return `${input.supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${input.path}`;
}

async function main() {
  if (process.env.ALLOW_IMAGE_NORMALIZATION !== "true") {
    console.error("Refusing to run: set ALLOW_IMAGE_NORMALIZATION=true to enable this POC.");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const args = process.argv.slice(2);
  const mode = getCliMode(args);
  if (!mode) {
    console.error("Missing or invalid --mode. No database updates were made.");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const slug = getSlugArg(args);
  if (!slug) {
    console.error("Missing required coffee slug argument. No database updates were made.");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const supabaseUrl = getSupabaseBaseUrl();
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const before = await prisma.coffeeLot.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      nameAr: true,
      imageUrl: true,
      imagePath: true,
      imagePermissionStatus: true,
      originalImageUrl: true,
      storedImageUrl: true,
      imageStorageProvider: true,
      imageStoredAt: true,
    },
  });

  if (!before) {
    console.error(`CoffeeLot not found for slug: ${slug}. No database updates were made.`);
    process.exitCode = 1;
    return;
  }

  printLot("Before:", before);

  const source = getSourceImageUrl(before);
  if (!source) {
    console.error("No approved imageUrl or usable imagePath source was found. No database updates were made.");
    process.exitCode = 1;
    return;
  }

  console.log(`Source image: ${source.sourceKind}`);
  console.log(source.sourceUrl);
  console.log(`Normalization mode: ${mode}`);

  const sourceImage = await downloadSourceImage(source.sourceUrl);
  const normalizedInputBytes =
    mode === "packshot"
      ? await removeImageBackground({
          sourceImageBytes: sourceImage.bytes,
        })
      : sourceImage.bytes;
  const normalizedWebp = await buildNormalizedWebp(normalizedInputBytes, mode);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = `normalized/${normalizeSlugForPath(before.slug)}-${timestamp}.webp`;
  const storedImageUrl = await uploadNormalizedImage({
    supabaseUrl,
    serviceRoleKey,
    path: storagePath,
    imageBytes: normalizedWebp,
  });
  console.log(`Uploaded normalized image URL: ${storedImageUrl}`);

  await prisma.coffeeLot.update({
    where: { id: before.id },
    data: {
      storedImageUrl,
      ...(before.originalImageUrl || !before.imageUrl
        ? {}
        : { originalImageUrl: before.imageUrl }),
      imageStorageProvider: getStorageProvider(mode),
      imageStoredAt: new Date(),
    },
  });

  const after = await prisma.coffeeLot.findUniqueOrThrow({
    where: { id: before.id },
    select: {
      slug: true,
      nameAr: true,
      imageUrl: true,
      imagePath: true,
      originalImageUrl: true,
      storedImageUrl: true,
      imageStorageProvider: true,
      imageStoredAt: true,
    },
  });

  printLot("After:", after);
  console.log(`Uploaded normalized image path: ${storagePath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
