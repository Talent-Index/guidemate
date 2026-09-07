import { Router } from "express";
import { provisionGuideWallet } from "../wallet.js";
import {
  buildReportCsv,
  getAdminTransactions,
  getAnalyticsOverview,
  getSignupsTimeseries,
} from "../analytics.js";
import { getAdminUserIdFromAuthHeader, getAnalyticsUserIdFromAuthHeader, supabaseAdmin } from "../supabase.js";
import { z } from "zod";

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

adminRouter.get("/analytics/overview", async (req, res) => {
  const userId = await getAnalyticsUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(403).json({ error: "analytics access required" });

  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const overview = await getAnalyticsOverview(from, to);
    res.json({ overview });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get("/analytics/timeseries", async (req, res) => {
  const userId = await getAnalyticsUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(403).json({ error: "analytics access required" });

  try {
    const days = Number(req.query.days ?? 30);
    const signups = await getSignupsTimeseries(days);
    res.json({ signups });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get("/transactions", async (req, res) => {
  const userId = await getAnalyticsUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(403).json({ error: "analytics access required" });

  try {
    const transactions = await getAdminTransactions({
      limit: Number(req.query.limit ?? 100),
      offset: Number(req.query.offset ?? 0),
      type: req.query.type as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    });
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get("/reports/export", async (req, res) => {
  const userId = await getAnalyticsUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(403).json({ error: "analytics access required" });

  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const csv = await buildReportCsv(from, to);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="guidemate-report.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

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

const createStaffSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  password: z.string().min(8).max(128),
});

adminRouter.get("/staff", async (req, res) => {
  const adminId = await getAdminUserIdFromAuthHeader(req.headers.authorization);
  if (!adminId) return res.status(403).json({ error: "super admin only" });

  try {
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "staff")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const staff = await Promise.all(
      (profiles ?? []).map(async (row) => {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.id);
        return {
          id: row.id,
          fullName: row.full_name,
          email: authUser.user?.email ?? null,
          createdAt: row.created_at,
        };
      })
    );

    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post("/staff", async (req, res) => {
  const adminId = await getAdminUserIdFromAuthHeader(req.headers.authorization);
  if (!adminId) return res.status(403).json({ error: "super admin only" });

  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const email = parsed.data.email.toLowerCase();
  const { fullName, password } = parsed.data;

  try {
    const existingId = await findUserIdByEmail(email);
    if (existingId) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", existingId)
        .maybeSingle();
      if (existingProfile?.role === "staff") {
        return res.status(409).json({ error: "This email already has a staff login." });
      }
      return res.status(409).json({ error: "This email already has an account. Use a different email for staff." });
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "staff" },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message ?? "could not create staff login");
    }

    const userId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      role: "staff",
      full_name: fullName,
    });
    if (profileError) throw new Error(profileError.message);

    res.json({ ok: true, staff: { id: userId, email, fullName } });
  } catch (err) {
    console.error("[admin] create staff failed", err);
    res.status(500).json({ error: (err as Error).message ?? "staff creation failed" });
  }
});

adminRouter.delete("/staff/:userId", async (req, res) => {
  const adminId = await getAdminUserIdFromAuthHeader(req.headers.authorization);
  if (!adminId) return res.status(403).json({ error: "super admin only" });

  const targetId = req.params.userId;
  if (targetId === adminId) {
    return res.status(400).json({ error: "You cannot revoke your own access." });
  }

  try {
    const { data: target, error: loadError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", targetId)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!target || target.role !== "staff") {
      return res.status(404).json({ error: "staff member not found" });
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "tourist" })
      .eq("id", targetId)
      .eq("role", "staff");
    if (updateError) throw new Error(updateError.message);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
