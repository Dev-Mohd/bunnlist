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

/** يحل الـ URL الصحيح: imageUrl إذا كانت الصورة معتمدة، وإلا imagePath أو placeholder */
function resolveImageSrc(
  imageUrl: string | null | undefined,
  imagePermissionStatus: string | null | undefined,
  imagePath: string | null | undefined,
): string {
  if (imageUrl && imagePermissionStatus === "APPROVED") return imageUrl;
  return getCoffeeImageUrl(imagePath ?? null);
}

/** بناء نص الكريديت المناسب */
function buildCreditLine(imageCredit: string | null | undefined): string | null {
  if (!imageCredit) return null;
  const lower = imageCredit.toLowerCase();
  if (lower === "black knight" || lower.includes("بلاك نايت"))
    return "Image courtesy of Black Knight";
  return `Image courtesy of ${imageCredit}`;
}

export type CoffeeImageVariant = "card" | "detail" | "admin";

type CoffeeImageProps = {
  /** مسار صورة Supabase */
  imagePath?: string | null;
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
  const initialSrc = resolveImageSrc(imageUrl, imagePermissionStatus, imagePath);
  const [src, setSrc] = React.useState(initialSrc);

  const isOfficialImage = Boolean(imageUrl) && imagePermissionStatus === "APPROVED";
  const fitClass = getImageFitClass(roasteryName);
  const alt = coffeeName ? `صورة ${coffeeName}` : "صورة قهوة";
  const creditLine = isOfficialImage ? buildCreditLine(imageCredit) : null;

  // الروابط الخارجية والـ Supabase (http) → <img> مع max-h/max-w للتمركز الطبيعي
  // المسارات المحلية كـ placeholder.svg → next/image fill + object-contain
  const innerImage = src.startsWith("http") ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("w-auto h-auto object-contain", fitClass)}
      loading={priority ? "eager" : "lazy"}
      onError={() => setSrc("/placeholder-coffee.svg")}
    />
  ) : (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className="object-contain"
      onError={() => setSrc("/placeholder-coffee.svg")}
    />
  );

  // ── card ─────────────────────────────────────────────────────────
  if (variant === "card") {
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
    return (
      <div
        className={cn(
          "relative w-full aspect-[4/3] overflow-hidden rounded-xl shadow-sm flex items-center justify-center",
          isOfficialImage ? "bg-stone-100" : "bg-stone-50 opacity-40 saturate-0",
          className,
        )}
      >
        {innerImage}
        {creditLine ? (
          <div className="absolute inset-x-0 bottom-0 bg-stone-950/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            {creditLine}
          </div>
        ) : null}
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
