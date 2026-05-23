"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { getCoffeeImageUrl, uploadCoffeeImage } from "@/lib/storage";

const imageFileSchema = z
  .instanceof(File, { message: "اختر صورة للرفع." })
  .refine((file) => file.type.startsWith("image/"), "الملف يجب أن يكون صورة.")
  .refine((file) => file.size <= 5 * 1024 * 1024, "حجم الصورة يجب ألا يتجاوز 5 ميجابايت.");

export async function uploadCoffeeImageAction(
  formData: FormData,
): Promise<{ path: string; url: string } | { error: string }> {
  await requireAdmin();

  const parsed = imageFileSchema.safeParse(formData.get("file"));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "الصورة غير صحيحة." };
  }

  const result = await uploadCoffeeImage(parsed.data);
  if ("error" in result) {
    return result;
  }

  return {
    path: result.path,
    url: getCoffeeImageUrl(result.path),
  };
}
