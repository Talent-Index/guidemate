import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "./supabase.js";

export const XP_PER_QUALIFIED_GUIDE = 100;
export const XP_TO_CLAIM_EXPERIENCE = 300;

export type ReferralSummary = {
  referralCode: string;
  referralXp: number;
  xpPerQualifiedGuide: number;
  xpToClaimExperience: number;
  canClaimExperience: boolean;
  referrals: Array<{
    id: string;
    status: string;
    referredGuideName: string | null;
    xpAwarded: number;
    qualifiedAt: string | null;
    createdAt: string;
  }>;
  claims: Array<{
    id: string;
    experienceId: string;
    experienceTitle: string | null;
    xpSpent: number;
    status: string;
    createdAt: string;
  }>;
};

function normalizeCode(raw: string): string {
  return raw.trim().toLowerCase();
}

function randomSuffix(): string {
  return randomBytes(2).toString("hex").toUpperCase();
}

function baseFromName(fullName: string | null): string {
  const letters = (fullName ?? "GUIDE").replace(/[^a-zA-Z]/g, "").toUpperCase();
  const base = letters.slice(0, 10) || "GUIDE";
  return base;
}

async function codeTaken(code: string, exceptProfileId?: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("referral_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return false;
  if (exceptProfileId && data.id === exceptProfileId) return false;
  return true;
}

export async function ensureReferralCode(profileId: string, fullName: string | null): Promise<string> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("referral_code, full_name")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (profile?.referral_code) return profile.referral_code as string;

  const name = fullName ?? (profile?.full_name as string | null);
  let candidate = `${baseFromName(name)}${randomSuffix()}`;
  for (let i = 0; i < 8; i++) {
    if (!(await codeTaken(candidate, profileId))) break;
    candidate = `${baseFromName(name)}${randomSuffix()}`;
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ referral_code: candidate })
    .eq("id", profileId);
  if (updateError) throw new Error(updateError.message);
  return candidate;
}

export async function resolveReferrerProfileId(referralCode: string | undefined | null): Promise<string | null> {
  if (!referralCode?.trim()) return null;
  const code = normalizeCode(referralCode);
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("referral_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.id as string) ?? null;
}

export async function recordReferralOnApproval(applicationId: string, referredGuideId: string): Promise<void> {
  const { data: application, error } = await supabaseAdmin
    .from("guide_applications")
    .select("referrer_profile_id, referral_code")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!application?.referrer_profile_id) return;
  if (application.referrer_profile_id === referredGuideId) return;

  const { error: insertError } = await supabaseAdmin.from("guide_referrals").insert({
    referrer_profile_id: application.referrer_profile_id,
    referred_guide_id: referredGuideId,
    application_id: applicationId,
    status: "pending",
    xp_awarded: 0,
  });
  if (insertError && insertError.code !== "23505") throw new Error(insertError.message);
}

export async function tryQualifyGuideReferrals(guideId: string): Promise<{ qualified: number }> {
  const { count, error: countError } = await supabaseAdmin
    .from("experiences")
    .select("id", { count: "exact", head: true })
    .eq("guide_id", guideId)
    .eq("status", "published")
    .eq("is_active", true);
  if (countError) throw new Error(countError.message);
  if (!count || count < 1) return { qualified: 0 };

  const { data: rows, error } = await supabaseAdmin
    .from("guide_referrals")
    .select("id, referrer_profile_id, xp_awarded, status")
    .eq("referred_guide_id", guideId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  if (!rows?.length) return { qualified: 0 };

  let qualified = 0;
  for (const row of rows) {
    if (row.status !== "pending" || row.xp_awarded > 0) continue;

    const referrerId = row.referrer_profile_id as string;
    const { data: referrer, error: refErr } = await supabaseAdmin
      .from("profiles")
      .select("referral_xp")
      .eq("id", referrerId)
      .maybeSingle();
    if (refErr) throw new Error(refErr.message);

    const nextXp = Number(referrer?.referral_xp ?? 0) + XP_PER_QUALIFIED_GUIDE;
    const { error: xpError } = await supabaseAdmin
      .from("profiles")
      .update({ referral_xp: nextXp })
      .eq("id", referrerId);
    if (xpError) throw new Error(xpError.message);

    const { error: updError } = await supabaseAdmin
      .from("guide_referrals")
      .update({
        status: "qualified",
        xp_awarded: XP_PER_QUALIFIED_GUIDE,
        qualified_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (updError) throw new Error(updError.message);
    qualified += 1;
  }

  return { qualified };
}

export async function getReferralSummary(profileId: string): Promise<ReferralSummary> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("full_name, referral_code, referral_xp")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error("profile not found");

  const referralCode = await ensureReferralCode(profileId, profile.full_name as string | null);
  const referralXp = Number(profile.referral_xp ?? 0);

  const { data: referralRows, error: refError } = await supabaseAdmin
    .from("guide_referrals")
    .select(
      "id, status, xp_awarded, qualified_at, created_at, referred_guide_id, referred:referred_guide_id ( full_name )"
    )
    .eq("referrer_profile_id", profileId)
    .order("created_at", { ascending: false });
  if (refError) throw new Error(refError.message);

  const { data: claimRows, error: claimError } = await supabaseAdmin
    .from("referral_reward_claims")
    .select("id, experience_id, xp_spent, status, created_at, experience:experience_id ( title )")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (claimError) throw new Error(claimError.message);

  return {
    referralCode,
    referralXp,
    xpPerQualifiedGuide: XP_PER_QUALIFIED_GUIDE,
    xpToClaimExperience: XP_TO_CLAIM_EXPERIENCE,
    canClaimExperience: referralXp >= XP_TO_CLAIM_EXPERIENCE,
    referrals: (referralRows ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      referredGuideName: (r.referred as { full_name?: string } | null)?.full_name ?? null,
      xpAwarded: Number(r.xp_awarded ?? 0),
      qualifiedAt: (r.qualified_at as string) ?? null,
      createdAt: r.created_at as string,
    })),
    claims: (claimRows ?? []).map((c) => ({
      id: c.id as string,
      experienceId: c.experience_id as string,
      experienceTitle: (c.experience as { title?: string } | null)?.title ?? null,
      xpSpent: Number(c.xp_spent),
      status: c.status as string,
      createdAt: c.created_at as string,
    })),
  };
}

export async function claimReferralExperience(profileId: string, experienceId: string): Promise<{ claimId: string }> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("referral_xp")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  const xp = Number(profile?.referral_xp ?? 0);
  if (xp < XP_TO_CLAIM_EXPERIENCE) {
    throw new Error(`You need at least ${XP_TO_CLAIM_EXPERIENCE} XP to claim an experience.`);
  }

  const { data: experience, error: expError } = await supabaseAdmin
    .from("experiences")
    .select("id, title, status, is_active")
    .eq("id", experienceId)
    .maybeSingle();
  if (expError) throw new Error(expError.message);
  if (!experience || experience.status !== "published" || !experience.is_active) {
    throw new Error("Choose a published experience from the marketplace.");
  }

  const { data: claim, error: claimError } = await supabaseAdmin
    .from("referral_reward_claims")
    .insert({
      profile_id: profileId,
      experience_id: experienceId,
      xp_spent: XP_TO_CLAIM_EXPERIENCE,
      status: "pending",
      notes: "Guidemate comp: referral reward",
    })
    .select("id")
    .single();
  if (claimError) throw new Error(claimError.message);

  const { error: deductError } = await supabaseAdmin
    .from("profiles")
    .update({ referral_xp: xp - XP_TO_CLAIM_EXPERIENCE })
    .eq("id", profileId);
  if (deductError) throw new Error(deductError.message);

  return { claimId: claim.id as string };
}
