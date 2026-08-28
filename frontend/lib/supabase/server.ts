import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/// Server Component / Route Handler Supabase client. Reads the user's session
/// from cookies so server-rendered pages can know who's signed in.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component - middleware handles session refresh instead.
        }
      },
    },
  });
}
