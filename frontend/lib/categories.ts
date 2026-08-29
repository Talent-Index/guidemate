// Mirrors the check constraint on experiences.category (backend/src/experiences.ts
// EXPERIENCE_CATEGORIES + the add_experience_category Supabase migration).
export const EXPERIENCE_CATEGORIES = [
  "Food & Drink",
  "Wildlife & Safari",
  "Art & Culture",
  "Adventure & Hiking",
  "Nightlife & Shopping",
  "Photography",
  "Dance & Music",
  "City Tours",
] as const;

export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];
