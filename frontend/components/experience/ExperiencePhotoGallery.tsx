"use client";

import { useState } from "react";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";

export function ExperiencePhotoGallery({ urls, alt }: { urls: string[]; alt: string }) {
  const photos = urls.length > 0 ? urls : [null];
  const primary = photos[0];
  const rest = photos.slice(1, 5);
  const [showAll, setShowAll] = useState(false);

  if (photos.length <= 1) {
    return (
      <ExperiencePhoto src={primary} alt={alt} className="aspect-[16/9] w-full rounded-2xl" sizes="100vw" />
    );
  }

  if (showAll) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--gm-ink)]">All photos</p>
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="text-sm font-semibold text-brand-accent hover:underline"
          >
            Back
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {photos.map((url, i) => (
            <ExperiencePhoto
              key={`${url ?? "ph"}-${i}`}
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

  return (
    <div className="relative">
      <div className="grid gap-2 overflow-hidden rounded-2xl md:grid-cols-4 md:grid-rows-2 md:aspect-[2.2/1]">
        <div className="relative col-span-2 row-span-2 min-h-[220px] md:min-h-0">
          <ExperiencePhoto src={primary} alt={alt} className="h-full w-full" sizes="50vw" />
        </div>
        {rest.map((url, i) => (
          <div key={`${url ?? "ph"}-${i}`} className="relative hidden min-h-0 md:block">
            <ExperiencePhoto src={url} alt={`${alt} ${i + 2}`} className="h-full w-full" sizes="25vw" />
          </div>
        ))}
        {rest.length < 4 &&
          Array.from({ length: 4 - rest.length }).map((_, i) => (
            <div key={`pad-${i}`} className="relative hidden min-h-0 bg-brand-bg md:block" />
          ))}
      </div>
      {photos.length > 1 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="absolute bottom-4 right-4 rounded-lg border border-brand-border bg-white px-4 py-2 text-xs font-semibold text-[var(--gm-ink)] shadow-sm transition hover:bg-brand-bg md:bottom-5 md:right-5"
        >
          Show all photos
        </button>
      )}
    </div>
  );
}
