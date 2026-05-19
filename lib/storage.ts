import { createClient } from "@supabase/supabase-js";

const COFFEE_IMAGES_BUCKET = "coffee-images";
const PLACEHOLDER_COFFEE_IMAGE = "/placeholder-coffee.svg";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
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

export async function uploadCoffeeImage(file: File): Promise<{ path: string }> {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase URL and service role key are required for uploads.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = crypto.randomUUID();
  const path = `lots/${safeName}.${extension}`;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase.storage
    .from(COFFEE_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return { path };
}
