"use client";

import * as React from "react";
import Image from "next/image";
import { getCoffeeImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

function getImageFitClass(roasteryName?: string | null): string {
  const name = roasteryName?.toLowerCase() ?? "";
  if (name.includes("black knight") || name.includes("بلاك نايت"))
    return "max-h-[84%] max-w-[72%]";
  if (name.includes("camel step") || name.includes("خطوة جمل"))
    return "max-h-[72%] max-w-[82%]";
  if (name.includes("out of line") || name.includes("اوت اوف لاين"))
    return "max-h-[76%] max-w-[86%]";
  return "max-h-[80%] max-w-[84%]";
}

/** يحل الـ URL الصحيح: storedImageUrl ثم imageUrl المعتمد، وإلا imagePath أو placeholder */
function resolveImageSrc(
  storedImageUrl: string | null | undefined,
  imageUrl: string | null | undefined,
  imagePermissionStatus: string | null | undefined,
  imagePath: string | null | undefined,
): string {
  if (storedImageUrl) return storedImageUrl;
  if (imageUrl && imagePermissionStatus === "APPROVED") return imageUrl;
  return getCoffeeImageUrl(imagePath ?? null);
}

export type CoffeeImageVariant = "card" | "detail" | "admin";

type CoffeeImageProps = {
  /** مسار صورة Supabase */
  imagePath?: string | null;
  /** رابط صورة BunnList المخزنة/المطبعة */
  storedImageUrl?: string | null;
  /** يميز نوع الصورة المخزنة: packshot أو source-card */
  imageStorageProvider?: string | null;
  /** رابط صورة رسمية خارجية */
  imageUrl?: string | null;
  /** يُعرض imageUrl فقط إذا كانت APPROVED */
  imagePermissionStatus?: string | null;
  imageCredit?: string | null;
  coffeeName?: string | null;
  roasteryName?: string | null;
  /**
   * card   — إطار مربع ثابت للشبكة العامة
   * detail — إطار 4/3 لصفحة تفاصيل المحصول مع كريديت اختياري
   * admin  — معاينة مدمجة في لوحة الإدارة
   * بدون variant — صورة خام فقط للاستخدامات الأخرى
   */
  variant?: CoffeeImageVariant;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function CoffeeImage({
  imagePath,
  storedImageUrl,
  imageStorageProvider,
  imageUrl,
  imagePermissionStatus,
  imageCredit,
  coffeeName,
  roasteryName,
  variant,
  sizes = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
  priority = false,
  className,
}: CoffeeImageProps) {
  const initialSrc = resolveImageSrc(storedImageUrl, imageUrl, imagePermissionStatus, imagePath);
  const [src, setSrc] = React.useState(initialSrc);

  const isOfficialImage =
    Boolean(storedImageUrl) || (Boolean(imageUrl) && imagePermissionStatus === "APPROVED");
  const isStoredImage = Boolean(storedImageUrl) && src === storedImageUrl;
  const isStoredSourceCard =
    isStoredImage && imageStorageProvider === "supabase-normalized-webp-source-card";
  const isStoredPackshot = isStoredImage && !isStoredSourceCard;
  const fitClass = getImageFitClass(roasteryName);
  const alt = coffeeName ? `صورة ${coffeeName}` : "صورة قهوة";
  void imageCredit;

  // الروابط الخارجية والـ Supabase (http) → <img> مع max-h/max-w للتمركز الطبيعي
  // المسارات المحلية كـ placeholder.svg → next/image fill + object-contain
  const innerImage = src.startsWith("http") ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={
        isStoredPackshot && variant === "card"
          ? "h-[90%] w-[90%] object-contain"
        : isStoredPackshot
          ? "h-full w-full object-contain"
          : isStoredSourceCard && variant === "detail"
            ? "w-auto h-auto object-contain max-h-[90%] max-w-[78%]"
          : cn("w-auto h-auto object-contain", fitClass)
      }
      loading={priority ? "eager" : "lazy"}
      onError={() => {
        setSrc("/placeholder-coffee.svg");
      }}
    />
  ) : (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className="object-contain"
      onError={() => {
        setSrc("/placeholder-coffee.svg");
      }}
    />
  );

  // ── card ─────────────────────────────────────────────────────────
  if (variant === "card") {
    if (isStoredPackshot) {
      return (
        <div
          className={cn(
            "relative w-full aspect-square overflow-hidden border border-[#EDE3D6] bg-white p-2 flex items-center justify-center",
            className,
          )}
        >
          <div className="relative h-full w-full overflow-hidden rounded-md bg-white">
            {innerImage}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "relative w-full aspect-square bg-[#F7F5F1] overflow-hidden flex items-center justify-center",
          className,
        )}
      >
        {innerImage}
      </div>
    );
  }

  // ── detail ────────────────────────────────────────────────────────
  if (variant === "detail") {
    if (isStoredPackshot) {
      return (
        <div
          className={cn(
            "relative w-full aspect-[4/3] overflow-hidden rounded-xl border border-[rgba(74,52,40,0.12)] bg-white p-2 sm:p-3 flex items-center justify-center shadow-sm",
            className,
          )}
        >
          <div className="relative h-full max-h-[96%] aspect-square overflow-hidden rounded-lg bg-white">
            {innerImage}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "relative w-full aspect-[4/3] overflow-hidden rounded-xl shadow-sm flex items-center justify-center",
          isStoredSourceCard
            ? "bg-[#F7F5F1]"
            : isOfficialImage
              ? "bg-stone-100"
              : "bg-stone-50 opacity-40 saturate-0",
          className,
        )}
      >
        {innerImage}
      </div>
    );
  }

  // ── admin ─────────────────────────────────────────────────────────
  if (variant === "admin") {
    return (
      <div
        className={cn(
          "aspect-square overflow-hidden rounded-lg border border-stone-200 bg-[#F7F5F1] flex items-center justify-center",
          className,
        )}
      >
        {innerImage}
      </div>
    );
  }

  // ── بدون variant — صورة خام للاستخدامات القديمة ──────────────────
  return (
    <div className={cn("relative h-full w-full", className)}>
      {innerImage}
    </div>
  );
}
