import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeReturnTo } from "@/lib/auth/returnTo";

function redirectOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const origin = redirectOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const type = request.nextUrl.searchParams.get("type");
  const next = safeReturnTo(request.nextUrl.searchParams.get("next"));
  const oauthError = request.nextUrl.searchParams.get("error_description") ?? request.nextUrl.searchParams.get("error");

  if (oauthError && !code) {
    const dest = new URL("/auth/callback", origin);
    dest.searchParams.set("error", oauthError);
    return NextResponse.redirect(dest);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/callback", origin));
  }

  const pendingCookies: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  const dest = new URL(error ? "/auth/callback" : next ?? "/auth/continue", origin);
  if (error) {
    dest.searchParams.set("error", error.message);
  } else if (!next && type) {
    dest.searchParams.set("type", type);
  }

  const response = NextResponse.redirect(dest);
  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
