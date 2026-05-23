"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const PLACEHOLDER_COFFEE_IMAGE = "/placeholder-coffee.svg";

type CoffeeImageProps = {
  src?: string | null;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  children?: React.ReactNode;
};

export function CoffeeImage({
  src,
  alt,
  priority,
  sizes = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
  className,
  imageClassName,
  children,
}: CoffeeImageProps) {
  const initialSrc = src || PLACEHOLDER_COFFEE_IMAGE;
  const [imageSrc, setImageSrc] = React.useState(initialSrc);

  React.useEffect(() => {
    setImageSrc(initialSrc);
  }, [initialSrc]);

  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-stone-100 p-6",
        className,
      )}
    >
      <Image
        src={imageSrc}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn("h-full w-full object-contain", imageClassName)}
        onError={() => setImageSrc(PLACEHOLDER_COFFEE_IMAGE)}
      />
      {children}
    </div>
  );
}
