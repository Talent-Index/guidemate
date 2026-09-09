import type { createClient } from "@/lib/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

type PendingProfile = {
  fullName: string;
  phone: string | null;
};

/// Ensures a profile row exists for the signed-in user. New profiles are always
/// tourist — guide profiles are created server-side after admin approval.
export async function ensureTouristProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  meta: Record<string, unknown> | undefined
) {
  let { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile) return profile;

  const pendingRaw =
    localStorage.getItem(`guidemate_pending_profile_${email}`) ??
    localStorage.getItem("guidemate_pending_profile_google");
  const pending = pendingRaw ? (JSON.parse(pendingRaw) as PendingProfile) : null;
  const fullName =
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    pending?.fullName ||
    email;
  const phone = (typeof meta?.phone === "string" && meta.phone) || pending?.phone || null;

  const { data: created, error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userId, role: "tourist", full_name: fullName, phone })
    .select("role")
    .single();

  if (profileError) {
    const { data: existing } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (!existing) throw profileError;
    profile = existing;
  } else {
    profile = created;
  }

  localStorage.removeItem(`guidemate_pending_profile_${email}`);
  localStorage.removeItem("guidemate_pending_profile_google");
  return profile;
}
