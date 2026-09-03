"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface ExperiencePhotoProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
}

/** Photo for an experience card/hero, with a graceful placeholder when no photo has been set yet. */
export function ExperiencePhoto({ src, alt, className = "", sizes }: ExperiencePhotoProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;
  const remote = Boolean(src?.startsWith("http://") || src?.startsWith("https://"));

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-brand-blue to-brand-accent ${className}`}>
      {showImage && remote ? (
        // Remote Unsplash / Supabase photos must not go through next/image.
        // The optimizer often 400s them (especially on Render), so cards show empty.
        <img
          src={src!}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={sizes ?? "100vw"}
          quality={85}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl text-white/70">📷</div>
      )}
    </div>
  );
}
