import { supabaseAdmin } from "./supabase.js";

export async function followGuide(followerId: string, guideId: string): Promise<{ followerCount: number }> {
  if (followerId === guideId) throw new Error("cannot follow yourself");

  const { data: guide } = await supabaseAdmin.from("profiles").select("id, role").eq("id", guideId).maybeSingle();
  if (!guide || guide.role !== "guide") throw new Error("guide not found");

  const { error } = await supabaseAdmin.from("guide_follows").insert({ follower_id: followerId, guide_id: guideId });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);

  const count = await countGuideFollowers(guideId);
  return { followerCount: count };
}

export async function unfollowGuide(followerId: string, guideId: string): Promise<{ followerCount: number }> {
  await supabaseAdmin.from("guide_follows").delete().eq("follower_id", followerId).eq("guide_id", guideId);
  const count = await countGuideFollowers(guideId);
  return { followerCount: count };
}

export async function countGuideFollowers(guideId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("guide_follows")
    .select("id", { count: "exact", head: true })
    .eq("guide_id", guideId);
  if (error) return 0;
  return count ?? 0;
}

export async function isFollowingGuide(followerId: string, guideId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("guide_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("guide_id", guideId)
    .maybeSingle();
  return Boolean(data);
}

export async function listFollowerEmails(guideId: string): Promise<string[]> {
  const { data: rows } = await supabaseAdmin.from("guide_follows").select("follower_id").eq("guide_id", guideId).limit(2000);
  const ids = [...new Set((rows ?? []).map((r) => r.follower_id as string))];
  const emails = new Set<string>();

  for (const id of ids) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
      const email = authUser.user?.email?.trim().toLowerCase();
      if (email) emails.add(email);
    } catch {
      // skip
    }
  }

  return [...emails];
}
