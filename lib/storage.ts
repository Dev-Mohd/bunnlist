import { createClient } from "@supabase/supabase-js";

const COFFEE_IMAGES_BUCKET = "coffee-images";
const PLACEHOLDER_COFFEE_IMAGE = "/placeholder-coffee.svg";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function getSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    url.pathname = url.pathname.replace(/\/rest\/v1\/?$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  }
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getCoffeeImageUrl(path: string | null): string {
  const supabaseUrl = getSupabaseUrl();

  if (!path || !supabaseUrl) {
    return PLACEHOLDER_COFFEE_IMAGE;
  }

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${COFFEE_IMAGES_BUCKET}/${path.replace(/^\//, "")}`;
}

function getFileExtension(file: File) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase();

  if (nameExtension && /^[a-z0-9]+$/.test(nameExtension)) {
    return nameExtension === "jpeg" ? "jpg" : nameExtension;
  }

  const mimeExtension = file.type.split("/").pop()?.toLowerCase();
  if (mimeExtension) {
    return mimeExtension === "jpeg" ? "jpg" : mimeExtension;
  }

  return "jpg";
}

function validateImage(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "الملف يجب أن يكون صورة.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "حجم الصورة يجب ألا يتجاوز 5 ميجابايت.";
  }

  return null;
}

export async function uploadCoffeeImage(file: File): Promise<{ path: string } | { error: string }> {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "إعدادات رفع الصور غير مكتملة." };
  }

  const validationError = validateImage(file);
  if (validationError) {
    return { error: validationError };
  }

  const extension = getFileExtension(file);
  const random = crypto.randomUUID().split("-")[0];
  const path = `lots/${Date.now()}-${random}.${extension}`;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error: getBucketError } = await supabase.storage.getBucket(COFFEE_IMAGES_BUCKET);
  let bucketError = null;

  if (getBucketError) {
    const { error: createBucketError } = await supabase.storage.createBucket(COFFEE_IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: MAX_IMAGE_SIZE_BYTES,
    });
    bucketError = createBucketError;
  }

  if (bucketError) {
    return { error: "تعذر تجهيز مساحة تخزين الصور." };
  }

  const { error } = await supabase.storage
    .from(COFFEE_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    return { error: "تعذر رفع الصورة. حاول مرة أخرى." };
  }

  return { path };
}
