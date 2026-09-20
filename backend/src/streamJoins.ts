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
