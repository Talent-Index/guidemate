import { supabaseAdmin } from "./supabase.js";

export interface GuidePublicReview {
  stars: number;
  comment: string | null;
  createdAt: string;
  touristFirstName: string;
}

export interface GuidePublicExperience {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  priceUsdc: number;
  durationMinutes: number;
  location: string | null;
  imageUrl: string | null;
}

export interface GuidePublicProfile {
  id: string;
  fullName: string;
  bio: string | null;
  languages: string[];
  ratingAvg: number;
  ratingCount: number;
  isVetted: boolean;
  completedTripCount: number;
  reviews: GuidePublicReview[];
  experiences: GuidePublicExperience[];
}

function firstName(fullName: string | null | undefined): string {
  const name = fullName?.trim();
  if (!name) return "Guest";
  return name.split(/\s+/)[0] ?? "Guest";
}

export async function getGuidePublicProfile(guideId: string): Promise<GuidePublicProfile | undefined> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name, bio, languages, rating_avg, rating_count, is_vetted")
    .eq("id", guideId)
    .maybeSingle();

  if (error || !profile || profile.role !== "guide") return undefined;

  const [{ count: tripCount }, { data: ratingRows }, { data: experienceRows }] = await Promise.all([
    supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }).eq("guide_id", guideId).eq("status", "paid"),
    supabaseAdmin
      .from("ratings")
      .select("stars, comment, created_at, tourist_id")
      .eq("guide_id", guideId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("experiences")
      .select("id, title, description, tags, category, price_usdc, duration_minutes, location, image_url")
      .eq("guide_id", guideId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const touristIds = [...new Set((ratingRows ?? []).map((r) => r.tourist_id).filter((id): id is string => Boolean(id)))];
  const touristNames = new Map<string, string>();
  if (touristIds.length > 0) {
    const { data: tourists } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", touristIds);
    for (const t of tourists ?? []) {
      touristNames.set(t.id as string, firstName(t.full_name as string | null));
    }
  }

  return {
    id: profile.id,
    fullName: profile.full_name ?? "Guide",
    bio: profile.bio ?? null,
    languages: profile.languages ?? [],
    ratingAvg: Number(profile.rating_avg ?? 0),
    ratingCount: profile.rating_count ?? 0,
    isVetted: Boolean(profile.is_vetted),
    completedTripCount: tripCount ?? 0,
    reviews: (ratingRows ?? []).map((r) => ({
      stars: r.stars,
      comment: r.comment,
      createdAt: r.created_at,
      touristFirstName: (r.tourist_id ? touristNames.get(r.tourist_id as string) : undefined) ?? "Guest",
    })),
    experiences: (experienceRows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      tags: row.tags ?? [],
      category: row.category ?? null,
      priceUsdc: Number(row.price_usdc),
      durationMinutes: row.duration_minutes,
      location: row.location ?? null,
      imageUrl: row.image_url ?? null,
    })),
  };
}

export interface GuideStreamInsight {
  id: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  priceUsdc: number;
  experienceTitle: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  createdAt: string;
  tipCount: number;
  tipTotalUsdc: number;
  reactionCount: number;
  commentCount: number;
}

export interface GuideInsights {
  overview: {
    confirmedBookings: number;
    completedTours: number;
    refundedTours: number;
    scheduledStreams: number;
    pastStreams: number;
    tourEarningsUsdc: number;
    streamEarningsUsdc: number;
    ratingAvg: number;
    ratingCount: number;
  };
  upcomingStreams: Array<{
    id: string;
    title: string;
    status: "scheduled";
    priceUsdc: number;
    experienceTitle: string | null;
    scheduledAt: string | null;
    communityNotifiedAt: string | null;
  }>;
  pastStreams: GuideStreamInsight[];
}

export async function getGuideInsights(guideId: string): Promise<GuideInsights | undefined> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, rating_avg, rating_count")
    .eq("id", guideId)
    .maybeSingle();
  if (error || !profile || profile.role !== "guide") return undefined;

  const { listBookings } = await import("./bookings.js");
  const { aggregateStreamStats, listGuideStreams } = await import("./streams.js");

  const [bookings, streams] = await Promise.all([listBookings({ guideId }), listGuideStreams(guideId)]);
  const streamStats = await aggregateStreamStats(streams.map((s) => s.id));

  const locked = bookings.filter((b) => b.status === "locked");
  const paid = bookings.filter((b) => b.status === "paid");
  const refunded = bookings.filter((b) => b.status === "refunded");

  const tourEarningsUsdc = paid.reduce(
    (sum, b) => sum + (b.splits?.guideAmount ?? Number((b.amountUsdc * 0.85).toFixed(2))),
    0
  );

  const pastStreamRows = streams.filter((s) => s.status === "ended");
  const pastStreams: GuideStreamInsight[] = pastStreamRows.map((s) => {
    const stats = streamStats.get(s.id) ?? { tipCount: 0, tipTotalUsdc: 0, reactionCount: 0, commentCount: 0 };
    return {
      id: s.id,
      title: s.title,
      status: s.status,
      priceUsdc: s.priceUsdc,
      experienceTitle: s.experienceTitle,
      scheduledAt: s.scheduledAt,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      recordingUrl: s.recordingUrl,
      createdAt: s.createdAt,
      ...stats,
    };
  });

  const streamEarningsUsdc = pastStreams.reduce((sum, s) => sum + s.tipTotalUsdc, 0);
  const upcomingStreams = streams
    .filter((s) => s.status === "scheduled")
    .map((s) => ({
      id: s.id,
      title: s.title,
      status: "scheduled" as const,
      priceUsdc: s.priceUsdc,
      experienceTitle: s.experienceTitle,
      scheduledAt: s.scheduledAt,
      communityNotifiedAt: s.communityNotifiedAt,
    }));

  return {
    overview: {
      confirmedBookings: locked.length,
      completedTours: paid.length,
      refundedTours: refunded.length,
      scheduledStreams: upcomingStreams.length,
      pastStreams: pastStreams.length,
      tourEarningsUsdc: Number(tourEarningsUsdc.toFixed(2)),
      streamEarningsUsdc: Number(streamEarningsUsdc.toFixed(2)),
      ratingAvg: Number(profile.rating_avg ?? 0),
      ratingCount: Number(profile.rating_count ?? 0),
    },
    upcomingStreams,
    pastStreams,
  };
}
