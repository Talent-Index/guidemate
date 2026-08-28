import { createBrowserClient } from "@supabase/ssr";

/// Browser-side Supabase client using the public anon key. Row Level Security
/// on every table enforces what each signed-in user can actually read/write -
/// this key alone grants no special access.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
