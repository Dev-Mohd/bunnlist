import { createClient } from "@supabase/supabase-js";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";

// Product photos for coffee suggestions. The app lifts the bag out of its
// background on the device and uploads only that cut-out JPEG; it goes to the
// private "suggestion-images" bucket through this server (the service key never
// leaves it). One photo per suggestion, owner only, while the suggestion is pending.

export const SUGGESTION_BUCKET = "suggestion-images";
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export const SuggestionPhotoRequest = z.object({
  imageBase64: z.string().min(100).max(Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 4),
});

/** Decodes and checks the JPEG signature and size. */
export function decodeJpeg(base64: string): Buffer {
  const bytes = Buffer.from(base64, "base64");
  const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isJpeg) throw ApiError.unprocessable("not_jpeg");
  if (bytes.length > MAX_PHOTO_BYTES) throw ApiError.unprocessable("photo_too_large");
  return bytes;
}

export function photoPath(submissionId: string): string {
  return `submissions/${submissionId}.jpg`;
}

/** Port for the storage upload, so the rules are testable without Supabase. */
export interface PhotoStore {
  put(path: string, bytes: Buffer): Promise<void>;
  /** A short-lived URL to view a private suggestion photo (admin review). */
  signedUrl(path: string): Promise<string | null>;
  /** Copies a suggestion photo into the public catalog bucket; returns its public URL. */
  publish(path: string, destination: string): Promise<string>;
}

export const CATALOG_BUCKET = "coffee-images";

function supabaseUrl(): string | undefined {
  const raw = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  return raw?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function supabasePhotoStore(): PhotoStore {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw ApiError.forbidden("storage_not_configured");
  const client = createClient(url, key, { auth: { persistSession: false } });
  return {
    async put(path, bytes) {
      const { error } = await client.storage.from(SUGGESTION_BUCKET).upload(path, bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) throw new Error(`suggestion photo upload failed: ${error.message}`);
    },
    async signedUrl(path) {
      const { data, error } = await client.storage.from(SUGGESTION_BUCKET).createSignedUrl(path, 60 * 60);
      return error ? null : data.signedUrl;
    },
    async publish(path, destination) {
      const { data: file, error: downloadError } = await client.storage.from(SUGGESTION_BUCKET).download(path);
      if (downloadError || !file) throw new Error(`suggestion photo download failed: ${downloadError?.message}`);
      // The catalog bucket is public; create it on first use, as the website does.
      const { error: bucketError } = await client.storage.getBucket(CATALOG_BUCKET);
      if (bucketError) {
        await client.storage.createBucket(CATALOG_BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
      }
      const { error } = await client.storage.from(CATALOG_BUCKET).upload(destination, file, {
        contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
      });
      if (error) throw new Error(`catalog photo upload failed: ${error.message}`);
      return client.storage.from(CATALOG_BUCKET).getPublicUrl(destination).data.publicUrl;
    },
  };
}

export async function attachSuggestionPhoto(
  prisma: PrismaClient, store: PhotoStore, accountId: string, submissionId: string, base64: string,
): Promise<{ photoPath: string }> {
  const submission = await prisma.mobileCoffeeSubmission.findUnique({ where: { id: submissionId } });
  // Someone else's suggestion reads as missing, never as forbidden.
  if (!submission || submission.accountId !== accountId) throw ApiError.unprocessable("submission_not_found");
  if (submission.status !== "PENDING") throw ApiError.conflict("submission_closed");

  const bytes = decodeJpeg(base64);
  const path = photoPath(submissionId);
  await store.put(path, bytes);
  await prisma.mobileCoffeeSubmission.update({ where: { id: submissionId }, data: { photoPath: path } });
  return { photoPath: path };
}
