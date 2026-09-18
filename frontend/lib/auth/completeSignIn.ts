import type { Session } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/client";
import { homeForRole, type AccountRole } from "@/lib/auth/home";
import { ensureTouristProfile } from "@/lib/auth/ensureProfile";
import { inferInviteFlowFromProfile, type AuthCallbackFlow } from "@/lib/auth/callbackSession";
import { consumeAuthReturnTo } from "@/lib/auth/returnTo";
import { registerOpenGuide } from "@/lib/api";
import { clearPendingOpenGuideProfile, readPendingOpenGuideProfile } from "@/lib/auth/openGuideSignup";

type SupabaseClient = ReturnType<typeof createClient>;

export async function destinationAfterAuth(opts: {
  supabase: SupabaseClient;
  session: Session;
  flow: AuthCallbackFlow;
  hadCallbackParams: boolean;
}) {
  const { supabase, session, flow, hadCallbackParams } = opts;
  const user = session.user;
  const email = user.email ?? "";
  const meta = user.user_metadata as Record<string, unknown> | undefined;

  if (flow === "recovery") return "/auth/reset-password";

  const needsGuideInviteSetup =
    flow === "invite" || (hadCallbackParams && (await inferInviteFlowFromProfile(supabase, user.id)));

  if (needsGuideInviteSetup) return "/auth/set-password";

  const pendingOpenGuide = readPendingOpenGuideProfile(email);
  if (pendingOpenGuide) {
    await registerOpenGuide(session.access_token);
    clearPendingOpenGuideProfile(email);
    return consumeAuthReturnTo() ?? homeForRole("guide");
  }

  const profile = await ensureTouristProfile(supabase, user.id, email, meta);
  return consumeAuthReturnTo() ?? homeForRole((profile?.role ?? "tourist") as AccountRole);
}
