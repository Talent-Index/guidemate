import Image from "next/image";

interface ExperiencePhotoProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
}

/** Photo for an experience card/hero, with a graceful placeholder when no photo has been set yet. */
export function ExperiencePhoto({ src, alt, className = "", sizes }: ExperiencePhotoProps) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-brand-blue to-brand-accent ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes ?? "100vw"} className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl text-white/70">📷</div>
      )}
    </div>
  );
}
