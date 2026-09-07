"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { Price } from "@/lib/fx";

export interface ExperienceCardData {
  id: string;
  title: string;
  price_usdc: number;
  image_url: string | null;
  category: string | null;
  guide: { full_name: string; rating_avg: number; rating_count: number } | null;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path
        d="M12 21s-7.2-4.6-9.6-9.1C.6 8.6 2.4 5 6 5c2 0 3.2 1.1 4 2.4C10.8 6.1 12 5 14 5c3.6 0 5.4 3.6 3.6 6.9C19.2 16.4 12 21 12 21z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
      />
    </svg>
  );
}

function savedKey(id: string) {
  return `guidemate-saved-${id}`;
}

export function ExperienceCard({
  experience,
  badge,
}: {
  experience: ExperienceCardData;
  badge?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(localStorage.getItem(savedKey(experience.id)) === "1");
  }, [experience.id]);

  function toggleSave(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    if (next) localStorage.setItem(savedKey(experience.id), "1");
    else localStorage.removeItem(savedKey(experience.id));
  }

  const rating = experience.guide?.rating_avg ?? 0;
  const ratingCount = experience.guide?.rating_count ?? 0;

  return (
    <Link href={`/experiences/${experience.id}`} className="group block w-[280px] shrink-0 sm:w-[300px]">
      <div className="relative overflow-hidden rounded-2xl">
        <ExperiencePhoto
          src={experience.image_url}
          alt={experience.title}
          className="aspect-[4/3] w-full transition duration-300 group-hover:scale-[1.02]"
          sizes="300px"
        />
        {badge && (
          <span className="absolute left-3 top-3 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] shadow-sm">
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={toggleSave}
          aria-label={saved ? "Remove from saved" : "Save experience"}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition ${
            saved ? "bg-white text-brand-accent" : "bg-black/20 text-white hover:bg-white hover:text-brand-accent"
          }`}
        >
          <HeartIcon filled={saved} />
        </button>
      </div>
      <div className="mt-3 space-y-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--gm-ink)]">{experience.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 text-sm text-brand-muted">
          <Price amountUsdc={experience.price_usdc} size="sm" align="start" className="inline-flex font-semibold text-[var(--gm-ink)]" />
          <span>/ guest</span>
          {ratingCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--gm-ink)]">
                <span className="text-brand-amber">★</span>
                {rating.toFixed(2)}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
