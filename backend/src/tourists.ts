import { supabaseAdmin } from "./supabase.js";

export interface TouristPublicReview {
  stars: number;
  comment: string | null;
  createdAt: string;
  guideFirstName: string;
  experienceTitle: string | null;
}

export interface TouristPublicProfile {
  id: string;
  fullName: string;
  phone: string | null;
  bio: string | null;
  languages: string[];
  ratingAvg: number;
  ratingCount: number;
  completedTripCount: number;
  reviews: TouristPublicReview[];
}

function firstName(fullName: string | null | undefined): string {
  const name = fullName?.trim();
  if (!name) return "Guide";
  return name.split(/\s+/)[0] ?? "Guide";
}

export async function viewerCanSeeTourist(viewerId: string, touristId: string): Promise<boolean> {
  if (viewerId === touristId) return true;

  const { data: viewer } = await supabaseAdmin.from("profiles").select("role").eq("id", viewerId).maybeSingle();
  if (viewer?.role !== "guide" && viewer?.role !== "admin") return false;
  if (viewer.role === "admin") return true;

  const { data: shared } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("guide_id", viewerId)
    .eq("tourist_id", touristId)
    .limit(1)
    .maybeSingle();

  return Boolean(shared);
}

export async function getTouristPublicProfile(touristId: string): Promise<TouristPublicProfile | undefined> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name, phone, bio, languages, rating_avg, rating_count")
    .eq("id", touristId)
    .maybeSingle();

  if (error || !profile || profile.role !== "tourist") return undefined;

  const [{ count: tripCount }, { data: ratingRows }] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tourist_id", touristId)
      .eq("status", "paid"),
    supabaseAdmin
      .from("tourist_ratings")
      .select("stars, comment, created_at, guide_id, booking_id")
      .eq("tourist_id", touristId)
      .order("created_at", { ascending: false }),
  ]);

  const guideIds = [...new Set((ratingRows ?? []).map((r) => r.guide_id).filter((id): id is string => Boolean(id)))];
  const bookingIds = [...new Set((ratingRows ?? []).map((r) => r.booking_id).filter((id): id is string => Boolean(id)))];

  const guideNames = new Map<string, string>();
  if (guideIds.length > 0) {
    const { data: guides } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", guideIds);
    for (const g of guides ?? []) {
      guideNames.set(g.id as string, firstName(g.full_name as string | null));
    }
  }

  const experienceTitles = new Map<string, string | null>();
  if (bookingIds.length > 0) {
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("id, experience:experience_id ( title )")
      .in("id", bookingIds);
    for (const b of bookings ?? []) {
      const experience = b.experience as { title?: string } | { title?: string }[] | null;
      const title = Array.isArray(experience) ? experience[0]?.title : experience?.title;
      experienceTitles.set(b.id as string, title ?? null);
    }
  }

  return {
    id: profile.id,
    fullName: profile.full_name ?? "Guest",
    phone: profile.phone ?? null,
    bio: profile.bio ?? null,
    languages: profile.languages ?? [],
    ratingAvg: Number(profile.rating_avg ?? 0),
    ratingCount: profile.rating_count ?? 0,
    completedTripCount: tripCount ?? 0,
    reviews: (ratingRows ?? []).map((r) => ({
      stars: r.stars,
      comment: r.comment,
      createdAt: r.created_at,
      guideFirstName: (r.guide_id ? guideNames.get(r.guide_id as string) : undefined) ?? "Guide",
      experienceTitle: r.booking_id ? (experienceTitles.get(r.booking_id as string) ?? null) : null,
    })),
  };
}
