import { createClient } from "@/lib/supabase/server";
import { isUuid, slugify } from "@/lib/slug";
import type { ExperienceCardData } from "@/components/experience/ExperienceCard";
import type { GuidePublicProfile } from "@/lib/api";

export interface PublicExperienceDetail {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  price_usdc: number;
  duration_minutes: number;
  location: string | null;
  meeting_lat: number | null;
  meeting_lng: number | null;
  meeting_label: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  itinerary: unknown;
  guide_id: string;
  guide: {
    id: string;
    slug: string | null;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
    languages: string[];
    rating_avg: number;
    rating_count: number;
    is_vetted: boolean;
  } | null;
}

export interface PublicExperienceReview {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  tourist: { full_name: string } | null;
}

export interface PublicExperienceBundle {
  experience: PublicExperienceDetail;
  reviews: PublicExperienceReview[];
  moreExperiences: ExperienceCardData[];
}

const EXPERIENCE_SELECT =
  "id, slug, guide_id, title, description, tags, category, price_usdc, duration_minutes, location, meeting_lat, meeting_lng, meeting_label, image_url, image_urls, itinerary, guide:guide_id ( id, slug, full_name, bio, avatar_url, languages, rating_avg, rating_count, is_vetted )";

function decodeIdOrSlug(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");
}

export async function fetchPublicExperience(idOrSlug: string): Promise<PublicExperienceBundle | null> {
  const supabase = await createClient();
  const published = () =>
    supabase.from("experiences").select(EXPERIENCE_SELECT).eq("status", "published").eq("is_active", true);
  const raw = decodeIdOrSlug(idOrSlug);

  let data: unknown = null;
  if (isUuid(raw)) {
    const result = await published().eq("id", raw).maybeSingle();
    data = result.data;
  } else {
    const exact = await published().eq("slug", raw).maybeSingle();
    data = exact.data;
    if (!data) {
      const guessed = slugify(raw);
      if (guessed && guessed !== raw) {
        const fallback = await published().eq("slug", guessed).maybeSingle();
        data = fallback.data;
      }
    }
  }

  if (!data) return null;
  const experience = data as unknown as PublicExperienceDetail;

  let reviews: PublicExperienceReview[] = [];
  let moreExperiences: ExperienceCardData[] = [];

  if (experience.guide?.id) {
    const [{ data: ratingRows }, { data: otherExps }] = await Promise.all([
      supabase
        .from("ratings")
        .select("id, stars, comment, created_at, tourist:tourist_id ( full_name )")
        .eq("guide_id", experience.guide.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("experiences")
        .select("id, slug, title, price_usdc, image_url, category, guide:guide_id ( full_name, rating_avg, rating_count )")
        .eq("status", "published")
        .eq("is_active", true)
        .neq("id", experience.id)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    reviews = (ratingRows as unknown as PublicExperienceReview[]) ?? [];
    moreExperiences = (otherExps as unknown as ExperienceCardData[]) ?? [];
  }

  return { experience, reviews, moreExperiences };
}

export async function fetchPublicGuideProfile(guideIdOrSlug: string): Promise<GuidePublicProfile | null> {
  try {
    const res = await fetch(`${apiBase()}/api/guides/${encodeURIComponent(decodeIdOrSlug(guideIdOrSlug))}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { guide?: GuidePublicProfile };
    return body.guide ?? null;
  } catch {
    return null;
  }
}

export function experienceSummary(description: string, max = 160): string {
  const first = description.split(/\n/)[0]?.trim() ?? "";
  if (first.length <= max) return first;
  return `${first.slice(0, max - 3)}...`;
}
