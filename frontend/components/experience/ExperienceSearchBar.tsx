"use client";

import { Button } from "@/components/ui/Button";

export function ExperienceSearchBar({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: () => void;
}) {
  return (
    <section id="experience-search" className="scroll-mt-24">
      <h2 className="text-xl font-bold text-[var(--gm-ink)]">Search experiences</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Look by name, neighborhood, or vibe — e.g. &ldquo;Westlands food&rdquo; or &ldquo;safari&rdquo;.
      </p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        <label className="sr-only" htmlFor="experience-search-input">Search experiences</label>
        <input
          id="experience-search-input"
          type="search"
          className="form-input-light min-w-0 flex-1"
          placeholder="Search tours and activities…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        <Button type="submit" variant="primary" className="shrink-0 sm:px-8">
          Search
        </Button>
      </form>
    </section>
  );
}
