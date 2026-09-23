import { Router } from "express";
import { getUserIdFromAuthHeader, supabaseAdmin } from "../supabase.js";
import { sendWelcomeEmail } from "../email.js";

export const notificationsRouter = Router();

/**
 * Sends a one-time welcome email to the signed-in user. Safe to call on every
 * sign-in: it no-ops once profiles.welcomed_at is set.
 */
notificationsRouter.post("/welcome", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, role, welcomed_at")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.welcomed_at) {
      return res.json({ ok: true, sent: false });
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUser.user?.email?.trim();
    if (!email) return res.json({ ok: true, sent: false });

    const sent = await sendWelcomeEmail(
      email,
      (profile?.full_name as string | null) ?? null,
      (profile?.role as string | undefined) ?? "tourist"
    );

    // Mark as welcomed even if delivery is disabled locally, to avoid retries.
    await supabaseAdmin
      .from("profiles")
      .update({ welcomed_at: new Date().toISOString() })
      .eq("id", userId);

    return res.json({ ok: true, sent });
  } catch (err) {
    console.error("[notifications] welcome failed", err);
    return res.status(500).json({ error: (err as Error).message ?? "welcome email failed" });
  }
});
