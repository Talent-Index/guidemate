import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[supabase] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/.env - " +
      "experience matching, bookings and profile lookups will fail until these are set."
  );
}

/// Service-role client: bypasses RLS entirely. This must only ever be used
/// server-side - never send SUPABASE_SERVICE_ROLE_KEY to the frontend.
export const supabaseAdmin = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

/// Verifies a user's Supabase access token (sent from the frontend as
/// `Authorization: Bearer <token>`) and returns their user id, or undefined
/// if the header is missing/invalid. Booking still succeeds without one -
/// it's simply not linked to a tourist account (e.g. the concierge/B2B flow).
export async function getUserIdFromAuthHeader(authHeader: string | undefined): Promise<string | undefined> {
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return undefined;
  return data.user.id;
}

/// Same as getUserIdFromAuthHeader, but only returns the id when the caller's
/// profiles.role is admin. Used to gate /api/admin/* routes.
export async function getAdminUserIdFromAuthHeader(authHeader: string | undefined): Promise<string | undefined> {
  const userId = await getUserIdFromAuthHeader(authHeader);
  if (!userId) return undefined;
  const { data, error } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error || data?.role !== "admin") return undefined;
  return userId;
}
