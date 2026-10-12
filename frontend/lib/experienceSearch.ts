import type { ExperienceCardData } from "@/components/experience/ExperienceCard";

export type ExperienceSearchable = ExperienceCardData & {
  description?: string;
  tags?: string[];
  location?: string | null;
};

function experienceHaystack(exp: ExperienceSearchable): string {
  return [
    exp.title,
    exp.description,
    exp.location,
    exp.category,
    ...(exp.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterExperiencesByQuery<T extends ExperienceSearchable>(
  experiences: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return experiences;
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  return experiences.filter((exp) => {
    const hay = experienceHaystack(exp);
    if (hay.includes(q)) return true;
    return tokens.every((token) => token.length <= 2 || hay.includes(token));
  });
}

function guideRating(exp: ExperienceSearchable): number {
  const g = exp.guide;
  if (!g || typeof g !== "object") return 0;
  const rating = (g as { rating_avg?: number }).rating_avg;
  return typeof rating === "number" ? rating : 0;
}

/** Suggestions when nothing matches the query (partial word overlap, then popular). */
export function recommendExperiences<T extends ExperienceSearchable>(
  experiences: T[],
  query: string,
  limit = 6
): T[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (tokens.length === 0) {
    return [...experiences]
      .sort((a, b) => guideRating(b) - guideRating(a))
      .slice(0, limit);
  }
  const scored = experiences.map((exp) => {
    const hay = experienceHaystack(exp);
    let score = 0;
    for (const token of tokens) {
      if (hay.includes(token)) score += 2;
      else if (token.length > 4 && hay.split(/\s+/).some((w) => w.startsWith(token.slice(0, 4)))) score += 1;
    }
    return { exp, score };
  });
  scored.sort((a, b) => b.score - a.score || guideRating(b.exp) - guideRating(a.exp));
  const withScore = scored.filter((s) => s.score > 0).map((s) => s.exp);
  if (withScore.length >= limit) return withScore.slice(0, limit);
  const ids = new Set(withScore.map((e) => e.id));
  const filler = [...experiences]
    .filter((e) => !ids.has(e.id))
    .sort((a, b) => guideRating(b) - guideRating(a));
  return [...withScore, ...filler].slice(0, limit);
}
