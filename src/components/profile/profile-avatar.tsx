"use client";

import Image from "next/image";
import { useState } from "react";

type ProfileAvatarProps = {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
};

export function ProfileAvatar({
  src,
  alt = "",
  size = 112,
  className = "builder-profile__avatar",
}: ProfileAvatarProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <span
        className={className}
        style={{ width: size, height: size, display: "inline-block" }}
        aria-hidden="true"
      />
    );
  }

  const isLocal = src.startsWith("/");
  const isDicebear = src.includes("api.dicebear.com");

  if (!isLocal && !isDicebear && !src.includes("/storage/v1/object/public/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={className}
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
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
      width={size}
      height={size}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}
