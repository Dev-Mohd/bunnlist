import { createClient } from "@supabase/supabase-js";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "./errors";
import { AVATAR_BUCKET, getProfile, type MobileProfileView } from "./profile";
import { decodeJpeg } from "./suggestionPhotos";

// Profile pictures. The app sends a square JPEG (≤ 2 MB); it goes to the public
// "avatars" bucket (created on first use, like the website's catalog bucket)
// under a new name each time, and the previous one is removed. Avatars are
// personal data, so account deletion removes them too.

export interface AvatarStore {
  put(path: string, bytes: Buffer): Promise<void>;
  remove(path: string): Promise<void>;
}

export function supabaseAvatarStore(): AvatarStore | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false } });
  return {
    async put(path, bytes) {
      const { error: bucketError } = await client.storage.getBucket(AVATAR_BUCKET);
      if (bucketError) {
        await client.storage.createBucket(AVATAR_BUCKET, {
          public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ["image/jpeg"],
        });
      }
      const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, bytes, {
        contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
      });
      if (error) throw new Error(`avatar upload failed: ${error.message}`);
    },
    async remove(path) {
      await client.storage.from(AVATAR_BUCKET).remove([path]);
    },
  };
}

export async function setAvatar(
  prisma: PrismaClient, store: AvatarStore | null, accountId: string, base64: string, now = Date.now(),
): Promise<MobileProfileView> {
  if (!store) throw ApiError.forbidden("storage_not_configured");
  const bytes = decodeJpeg(base64);
  const previous = await prisma.mobileProfile.findUnique({ where: { accountId }, select: { avatarPath: true } });
  const path = `${accountId}/${now.toString(36)}.jpg`;
  await store.put(path, bytes);
  await prisma.mobileProfile.upsert({ where: { accountId }, update: { avatarPath: path }, create: { accountId, avatarPath: path } });
  if (previous?.avatarPath) await store.remove(previous.avatarPath).catch(() => undefined);
  return getProfile(prisma, accountId);
}

export async function removeAvatar(prisma: PrismaClient, store: AvatarStore | null, accountId: string): Promise<MobileProfileView> {
  const profile = await prisma.mobileProfile.findUnique({ where: { accountId }, select: { avatarPath: true } });
  if (profile?.avatarPath) {
    await prisma.mobileProfile.update({ where: { accountId }, data: { avatarPath: null } });
    await store?.remove(profile.avatarPath).catch(() => undefined);
  }
  return getProfile(prisma, accountId);
}
