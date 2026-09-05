import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";

export function experiencePhotoUrls(row: {
  image_urls?: string[] | null;
  image_url?: string | null;
  experienceImageUrls?: string[] | null;
  experienceImageUrl?: string | null;
}): string[] {
  if (row.experienceImageUrls?.length) return row.experienceImageUrls;
  if (row.image_urls?.length) return row.image_urls;
  if (row.experienceImageUrl) return [row.experienceImageUrl];
  if (row.image_url) return [row.image_url];
  return [];
}

export function ExperiencePhotoStrip({
  urls,
  alt,
  className = "",
}: {
  urls: string[];
  alt: string;
  className?: string;
}) {
  if (urls.length === 0) {
    return (
      <ExperiencePhoto
        src={null}
        alt={alt}
        className={`h-24 w-28 shrink-0 rounded-lg ${className}`}
        sizes="112px"
      />
    );
  }

  if (urls.length === 1) {
    return (
      <ExperiencePhoto
        src={urls[0]}
        alt={alt}
        className={`h-24 w-28 shrink-0 rounded-lg ${className}`}
        sizes="112px"
      />
    );
  }

  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
      {urls.map((url, i) => (
        <ExperiencePhoto
          key={`${url}-${i}`}
          src={url}
          alt={`${alt} photo ${i + 1}`}
          className="h-24 w-28 shrink-0 rounded-lg"
          sizes="112px"
        />
      ))}
    </div>
  );
}
