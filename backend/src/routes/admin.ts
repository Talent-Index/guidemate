import { Router } from "express";
import { getAdminUserIdFromAuthHeader, supabaseAdmin } from "../supabase.js";
import { provisionGuideWallet } from "../wallet.js";

export const adminRouter = Router();

async function findUserIdByEmail(email: string): Promise<string | undefined> {
  const normalised = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === normalised);
    if (match) return match.id;
    if (data.users.length < perPage) return undefined;
    page += 1;
  }
}

adminRouter.post("/applications/:id/approve", async (req, res) => {
  const adminId = await getAdminUserIdFromAuthHeader(req.headers.authorization);
  if (!adminId) {
    return res.status(403).json({ error: "admin only" });
  }

  const applicationId = req.params.id;
  const { data: application, error: loadError } = await supabaseAdmin
    .from("guide_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (loadError) {
    return res.status(500).json({ error: loadError.message });
  }
  if (!application) {
    return res.status(404).json({ error: "application not found" });
  }
  if (application.status !== "pending") {
    return res.status(409).json({ error: `application already ${application.status}` });
  }

  try {
    let userId: string | undefined;
    const invited = await supabaseAdmin.auth.admin.inviteUserByEmail(application.email);
    if (invited.data?.user?.id) {
      userId = invited.data.user.id;
    } else {
      userId = await findUserIdByEmail(application.email);
    }
    if (!userId) {
      throw new Error(invited.error?.message ?? "could not create or find an auth user for this email");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      role: "guide",
      full_name: application.full_name,
      phone: application.phone,
      bio: [application.location, application.experience_pitch].filter(Boolean).join(" — "),
      is_vetted: true,
    });
    if (profileError) throw new Error(profileError.message);

    const walletAddress = await provisionGuideWallet(userId);

    const { error: updateError } = await supabaseAdmin
      .from("guide_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        approved_user_id: userId,
      })
      .eq("id", applicationId);
    if (updateError) throw new Error(updateError.message);

    res.json({ ok: true, userId, walletAddress });
  } catch (err) {
    console.error("[admin] approve failed", err);
    res.status(500).json({ error: (err as Error).message ?? "approval failed" });
  }
});
