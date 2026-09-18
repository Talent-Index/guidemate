import { Router } from "express";
import { getGuideInsights, getGuidePublicProfile } from "../guides.js";
import { getUserIdFromAuthHeader, supabaseAdmin } from "../supabase.js";
import { nextAvailableSlug } from "../slug.js";
import { provisionGuideWallet } from "../wallet.js";

export const guidesRouter = Router();

guidesRouter.post("/open-signup", async (req, res) => {
  if (process.env.GUIDE_OPEN_SIGNUP === "false") {
    return res.status(403).json({
      error: "Guide signup is invite-only right now. Use /apply for full vetting.",
    });
  }

  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  try {
    const { data: existing, error: loadError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, is_vetted, wallet_address, slug")
      .eq("id", userId)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError) throw new Error(authError.message);

    const fullName =
      (existing?.full_name as string | undefined)?.trim() ||
      (authData.user?.user_metadata?.full_name as string | undefined)?.trim() ||
      authData.user?.email?.split("@")[0] ||
      "Guide";

    let slug = (existing?.slug as string | null) ?? null;
    if (!slug) {
      slug = await nextAvailableSlug(
        fullName,
        async (candidate) => {
          const { data } = await supabaseAdmin.from("profiles").select("id").eq("slug", candidate).maybeSingle();
          return Boolean(data && data.id !== userId);
        },
        "guide"
      );
    }

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ role: "guide", full_name: fullName, is_vetted: true, slug })
        .eq("id", userId);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        role: "guide",
        full_name: fullName,
        is_vetted: true,
        slug,
      });
      if (insertError) throw new Error(insertError.message);
    }

    const walletAddress = await provisionGuideWallet(userId);
    res.json({ ok: true, walletAddress, slug });
  } catch (err) {
    console.error("[guides] open-signup failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

guidesRouter.get("/me/insights", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const insights = await getGuideInsights(userId);
  if (!insights) return res.status(403).json({ error: "guide account required" });

  res.json({ insights });
});

guidesRouter.get("/:guideId", async (req, res) => {
  const guide = await getGuidePublicProfile(req.params.guideId);
  if (!guide) {
    return res.status(404).json({ error: "guide not found" });
  }
  res.json({ guide });
});
