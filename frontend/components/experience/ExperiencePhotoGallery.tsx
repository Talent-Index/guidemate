"use client";

import { useState } from "react";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";

function validUrls(urls: string[]): string[] {
  return urls.filter((u) => Boolean(u?.trim()));
}

export function ExperiencePhotoGallery({
  urls,
  alt,
  layout = "hero",
}: {
  urls: string[];
  alt: string;
  layout?: "hero" | "quad";
}) {
  const photos = validUrls(urls);
  const [showAll, setShowAll] = useState(false);

  if (showAll) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--gm-ink)]">All photos</p>
          <button type="button" onClick={() => setShowAll(false)} className="text-sm font-semibold text-brand-accent hover:underline">
            Back
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {photos.map((url, i) => (
            <ExperiencePhoto
              key={`${url}-${i}`}
              src={url}
              alt={`${alt} ${i + 1}`}
              className="aspect-[4/3] w-full rounded-2xl"
              sizes="50vw"
            />
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <ExperiencePhoto src={null} alt={alt} className="aspect-[16/9] w-full rounded-2xl" sizes="100vw" />
    );
  }

  if (layout === "quad") {
    if (photos.length === 1) {
      return (
        <ExperiencePhoto
          src={photos[0]}
          alt={alt}
          className="aspect-[16/9] w-full rounded-2xl"
          sizes="100vw"
        />
      );
    }

    if (photos.length === 2) {
      return (
        <div className="relative overflow-hidden rounded-2xl">
          <div className="grid grid-cols-2 gap-2">
            {photos.map((url, i) => (
              <ExperiencePhoto
                key={url}
                src={url}
                alt={`${alt} ${i + 1}`}
                className="aspect-[4/3] w-full"
                sizes="45vw"
              />
            ))}
          </div>
          <ShowAllButton count={photos.length} onClick={() => setShowAll(true)} />
        </div>
      );
    }

    if (photos.length === 3) {
      return (
        <div className="relative overflow-hidden rounded-2xl">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:grid-rows-2">
            <div className="relative min-h-[200px] sm:row-span-2 sm:min-h-[280px]">
              <ExperiencePhoto
                src={photos[0]}
                alt={`${alt} 1`}
                className="aspect-[4/3] w-full sm:absolute sm:inset-0 sm:aspect-auto sm:min-h-0"
                sizes="40vw"
              />
            </div>
            <ExperiencePhoto src={photos[1]} alt={`${alt} 2`} className="aspect-[4/3] w-full" sizes="30vw" />
            <ExperiencePhoto src={photos[2]} alt={`${alt} 3`} className="aspect-[4/3] w-full" sizes="30vw" />
          </div>
          <ShowAllButton count={photos.length} onClick={() => setShowAll(true)} />
        </div>
      );
    }

    const quad = photos.slice(0, 4);
    return (
      <div className="relative">
        <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl">
          {quad.map((url, i) => (
            <ExperiencePhoto
              key={url}
              src={url}
              alt={`${alt} ${i + 1}`}
              className="aspect-[4/3] w-full"
              sizes="40vw"
            />
          ))}
        </div>
        {photos.length > 1 && <ShowAllButton count={photos.length} onClick={() => setShowAll(true)} />}
      </div>
    );
  }

  const primary = photos[0];
  const rest = photos.slice(1, 5);

  if (photos.length === 1) {
    return <ExperiencePhoto src={primary} alt={alt} className="aspect-[16/9] w-full rounded-2xl" sizes="100vw" />;
  }

  const mdCols = rest.length >= 3 ? 4 : rest.length === 2 ? 3 : 2;

  return (
    <div className="relative">
      <div
        className={`grid gap-2 overflow-hidden rounded-2xl md:aspect-[2.2/1] md:grid-rows-2 ${
          mdCols === 4 ? "md:grid-cols-4" : mdCols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
        }`}
      >
        <div
          className={`relative min-h-[220px] md:min-h-0 ${
            mdCols >= 3 ? "col-span-2 row-span-2" : "col-span-1 row-span-2 md:col-span-1"
          }`}
        >
          <ExperiencePhoto src={primary} alt={alt} className="h-full min-h-[220px] w-full md:min-h-0" sizes="50vw" />
        </div>
        {rest.map((url, i) => (
          <div key={url} className="relative hidden min-h-[120px] md:block">
            <ExperiencePhoto src={url} alt={`${alt} ${i + 2}`} className="h-full w-full" sizes="25vw" />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="absolute bottom-4 right-4 rounded-lg border border-brand-border bg-white px-4 py-2 text-xs font-semibold shadow-sm"
        >
          Show all photos
        </button>
      )}
    </div>
  );
}

function ShowAllButton({ count, onClick }: { count: number; onClick: () => void }) {
  if (count <= 1) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-3 right-3 rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold shadow-sm"
    >
      Show all photos
    </button>
  );
}
