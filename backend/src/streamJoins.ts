import { supabaseAdmin } from "./supabase.js";

async function countJoinMetrics(streamId: string): Promise<{ totalJoins: number; uniqueJoins: number }> {
  const { data, error } = await supabaseAdmin
    .from("stream_join_events")
    .select("viewer_identity")
    .eq("stream_id", streamId);
  if (error || !data) return { totalJoins: 0, uniqueJoins: 0 };
  const identities = data.map((row) => row.viewer_identity as string);
  return { totalJoins: identities.length, uniqueJoins: new Set(identities).size };
}

export async function recordStreamJoin(input: {
  streamId: string;
  profileId: string | null;
  viewerIdentity: string;
}): Promise<{ totalJoins: number; uniqueJoins: number }> {
  const { error: insertError } = await supabaseAdmin.from("stream_join_events").insert({
    stream_id: input.streamId,
    profile_id: input.profileId,
    viewer_identity: input.viewerIdentity,
  });

  if (insertError) {
    console.warn("[streams] join event insert failed", insertError.message);
  }

  return countJoinMetrics(input.streamId);
}

export async function getStreamJoinMetrics(streamId: string): Promise<{ totalJoins: number; uniqueJoins: number }> {
  return countJoinMetrics(streamId);
}

export interface StreamViewerRow {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
  joinCount: number;
}

export async function listStreamViewers(streamId: string, excludeProfileId?: string): Promise<StreamViewerRow[]> {
  const { data, error } = await supabaseAdmin
    .from("stream_join_events")
    .select("profile_id, joined_at, profiles:profile_id ( full_name, avatar_url )")
    .eq("stream_id", streamId)
    .not("profile_id", "is", null)
    .order("joined_at", { ascending: false });

  if (error || !data) return [];

  const byProfile = new Map<string, StreamViewerRow>();
  for (const row of data) {
    const profileId = row.profile_id as string;
    if (excludeProfileId && profileId === excludeProfileId) continue;
    const joinedAt = row.joined_at as string;
    const profile = row.profiles as { full_name?: string; avatar_url?: string | null } | null;
    const existing = byProfile.get(profileId);
    if (existing) {
      existing.joinCount += 1;
      if (joinedAt > existing.joinedAt) existing.joinedAt = joinedAt;
    } else {
      byProfile.set(profileId, {
        profileId,
        displayName: profile?.full_name?.trim() || "Viewer",
        avatarUrl: profile?.avatar_url ?? null,
        joinedAt,
        joinCount: 1,
      });
    }
  }

  return [...byProfile.values()].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
}

export async function bumpPeakViewerCount(streamId: string, currentViewers: number): Promise<number> {
  const { data: row } = await supabaseAdmin
    .from("live_streams")
    .select("peak_viewer_count")
    .eq("id", streamId)
    .maybeSingle();

  const peak = Number(row?.peak_viewer_count ?? 0);
  if (currentViewers <= peak) return peak;

  await supabaseAdmin.from("live_streams").update({ peak_viewer_count: currentViewers }).eq("id", streamId);
  return currentViewers;
}
