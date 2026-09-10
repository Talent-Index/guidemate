"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { homeForRole, type AccountRole } from "@/lib/auth/home";
import { ensureTouristProfile } from "@/lib/auth/ensureProfile";
import {
  completeAuthCallback,
  inferInviteFlowFromProfile,
} from "@/lib/auth/callbackSession";
import { consumeAuthReturnTo } from "@/lib/auth/returnTo";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { session, flow, error: callbackError, hadCallbackParams } = await completeAuthCallback(supabase);

      if (callbackError || !session) {
        setError(callbackError ?? "Could not complete sign-in");
        return;
      }

      const user = session.user;
      const email = user.email ?? "";
      const meta = user.user_metadata as Record<string, unknown> | undefined;

      const needsPasswordSetup =
        flow === "invite" ||
        flow === "recovery" ||
        (hadCallbackParams && (await inferInviteFlowFromProfile(supabase, user.id)));

      if (needsPasswordSetup) {
        await refreshProfile();
        router.replace("/auth/set-password");
        return;
      }

      const profile = await ensureTouristProfile(supabase, user.id, email, meta);
      await refreshProfile();
      const returnTo = consumeAuthReturnTo();
      router.replace(returnTo ?? homeForRole((profile?.role ?? "tourist") as AccountRole));
    })();
  }, [router, refreshProfile]);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="text-sm text-brand-muted">Completing sign-in…</p>
    </div>
  );
}
