import type { Session } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

export type AuthCallbackFlow = "invite" | "recovery" | "signup" | "oauth" | null;

export type AuthCallbackResult = {
  session: Session | null;
  flow: AuthCallbackFlow;
  error: string | null;
  hadCallbackParams: boolean;
};

function readHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function readQueryParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function flowFromType(type: string | null): AuthCallbackFlow {
  if (type === "invite") return "invite";
  if (type === "recovery") return "recovery";
  if (type === "signup") return "signup";
  return null;
}

function clearAuthCallbackUrl() {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, document.title, window.location.pathname);
}

/// Parses invite/OAuth callback params and establishes the correct session.
/// Clears any stale local session before applying tokens from the URL.
export async function completeAuthCallback(supabase: SupabaseClient): Promise<AuthCallbackResult> {
  const hash = readHashParams();
  const query = readQueryParams();

  const code = query.get("code");
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const hashType = hash.get("type");
  const queryType = query.get("type");
  const explicitFlow = flowFromType(hashType) ?? flowFromType(queryType);

  const hasCallbackParams = Boolean(code || (accessToken && refreshToken));

  if (!hasCallbackParams) {
    const { data, error } = await supabase.auth.getSession();
    return {
      session: data.session,
      flow: data.session ? "oauth" : null,
      error: error?.message ?? null,
      hadCallbackParams: false,
    };
  }

  await supabase.auth.signOut({ scope: "local" });

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { session: null, flow: explicitFlow ?? "invite", error: error.message, hadCallbackParams: true };
    }
    clearAuthCallbackUrl();
    return {
      session: data.session,
      flow: explicitFlow ?? "oauth",
      error: null,
      hadCallbackParams: true,
    };
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      return { session: null, flow: explicitFlow ?? "invite", error: error.message, hadCallbackParams: true };
    }
    clearAuthCallbackUrl();
    return {
      session: data.session,
      flow: explicitFlow ?? "oauth",
      error: null,
      hadCallbackParams: true,
    };
  }

  return { session: null, flow: null, error: "Could not complete sign-in", hadCallbackParams: true };
}

export function isInviteCallback(): boolean {
  const hash = readHashParams();
  const query = readQueryParams();
  return hash.get("type") === "invite" || query.get("type") === "invite";
}

/// PKCE invite links may omit type=invite — approved guides still need password setup.
export async function inferInviteFlowFromProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_vetted")
    .eq("id", userId)
    .maybeSingle();
  return profile?.role === "guide" && Boolean(profile.is_vetted);
}
