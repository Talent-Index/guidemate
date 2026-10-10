"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperienceRow } from "@/components/experience/ExperienceRow";
import type { ExperienceCardData } from "@/components/experience/ExperienceCard";

export function ExperienceSearchEmpty({
  query,
  recommendations,
  onClearSearch,
}: {
  query: string;
  recommendations: ExperienceCardData[];
  onClearSearch: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <Card className="border-brand-accent/25 bg-gradient-to-br from-brand-accent/5 to-[var(--gm-canvas)] p-6 text-center sm:p-8">
        <p className="text-3xl" aria-hidden>🧭</p>
        <h2 className="mt-3 text-lg font-bold text-brand-blueDark">Oops — not listed yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-brand-muted">
          We couldn&apos;t find an experience matching{" "}
          <span className="font-semibold text-brand-blueDark">&ldquo;{query}&rdquo;</span>. New guides join every
          week, or try a shorter search.
        </p>
        <Button type="button" variant="secondary" className="mt-5" onClick={onClearSearch}>
          Clear search
        </Button>
      </Card>

      {recommendations.length > 0 && (
        <ExperienceRow title="You might like these instead" experiences={recommendations} />
      )}
    </div>
  );
}
