import { supabaseAdmin } from "./supabase.js";

// Mirrors the check constraint on experiences.category (add_experience_category migration).
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

export interface ExperienceGuide {
  id: string;
  fullName: string;
  phone: string | null;
  walletAddress: string | null;
  bio: string | null;
  languages: string[];
  ratingAvg: number;
  ratingCount: number;
  isVetted: boolean;
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  priceUsdc: number;
  durationMinutes: number;
  location: string | null;
  imageUrl: string | null;
  guide: ExperienceGuide;
}

const SELECT = `
  id, title, description, tags, category, price_usdc, duration_minutes, location, image_url,
  guide:guide_id ( id, full_name, phone, wallet_address, bio, languages, rating_avg, rating_count, is_vetted )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toExperience(row: any): Experience {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: row.tags ?? [],
    category: row.category ?? null,
    priceUsdc: Number(row.price_usdc),
    durationMinutes: row.duration_minutes,
    location: row.location ?? null,
    imageUrl: row.image_url ?? null,
    guide: {
      id: row.guide?.id,
      fullName: row.guide?.full_name ?? "Guide",
      phone: row.guide?.phone ?? null,
      walletAddress: row.guide?.wallet_address ?? null,
      bio: row.guide?.bio ?? null,
      languages: row.guide?.languages ?? [],
      ratingAvg: Number(row.guide?.rating_avg ?? 0),
      ratingCount: row.guide?.rating_count ?? 0,
      isVetted: Boolean(row.guide?.is_vetted),
    },
  };
}

export async function listActiveExperiences(): Promise<Experience[]> {
  const { data, error } = await supabaseAdmin
    .from("experiences")
    .select(SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[experiences] failed to list active experiences", error.message);
    return [];
  }
  return (data ?? []).map(toExperience);
}

export async function getExperienceById(id: string): Promise<Experience | undefined> {
  const { data, error } = await supabaseAdmin.from("experiences").select(SELECT).eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return toExperience(data);
}
