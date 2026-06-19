"use client";

import Image from "next/image";
import { useState } from "react";
import type { ReactNode } from "react";

const REMOTE_HOSTS = ["api.dicebear.com"];

function canOptimize(src: string) {
  if (src.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(src);
    return REMOTE_HOSTS.includes(url.hostname) || url.pathname.includes("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

type ResilientCoverImageProps = {
  src?: string | null;
  alt: string;
  className: string;
  fallback?: ReactNode;
  priority?: boolean;
  sizes?: string;
};

export function ResilientCoverImage({
  src,
  alt,
  className,
  fallback = null,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: ResilientCoverImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <>{fallback}</>;
  }

  if (!canOptimize(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={className}
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <Image
      className={className}
      src={src}
      alt={alt}
      width={1200}
      height={675}
      priority={priority}
      sizes={sizes}
      onError={() => setHasError(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
