"use client";

import { useRef } from "react";
import Link from "next/link";
import { ExperienceCard, type ExperienceCardData } from "@/components/experience/ExperienceCard";

export function ExperienceRow({
  title,
  experiences,
  badgeForIndex,
  seeAllHref,
}: {
  title: string;
  experiences: ExperienceCardData[];
  badgeForIndex?: (index: number) => string | undefined;
  seeAllHref?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (experiences.length === 0) return null;

  function scrollBy(delta: number) {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <section className="py-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {seeAllHref ? (
            <Link href={seeAllHref} className="text-xl font-bold text-[var(--gm-ink)] hover:underline sm:text-2xl">
              {title}
            </Link>
          ) : (
            <h2 className="text-xl font-bold text-[var(--gm-ink)] sm:text-2xl">{title}</h2>
          )}
          {seeAllHref && (
            <span className="text-xl font-bold text-[var(--gm-ink)]" aria-hidden>›</span>
          )}
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollBy(-320)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-border text-brand-muted transition hover:border-[var(--gm-ink)] hover:text-[var(--gm-ink)]"
            aria-label="Scroll left"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(320)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-border text-brand-muted transition hover:border-[var(--gm-ink)] hover:text-[var(--gm-ink)]"
            aria-label="Scroll right"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="experience-row-scroll flex gap-5 overflow-x-auto pb-2 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {experiences.map((exp, index) => (
          <ExperienceCard key={exp.id} experience={exp} badge={badgeForIndex?.(index)} />
        ))}
      </div>
    </section>
  );
}
