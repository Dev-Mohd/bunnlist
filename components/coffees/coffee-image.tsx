"use client";

import * as React from "react";
import Image from "next/image";

type CoffeeImageProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

export function CoffeeImage({ src, alt, sizes, priority, className }: CoffeeImageProps) {
  const [imageSrc, setImageSrc] = React.useState(src);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => setImageSrc("/placeholder-coffee.svg")}
    />
  );
}
