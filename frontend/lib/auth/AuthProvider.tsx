"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  role: "guide" | "tourist" | "admin" | "staff";
  fullName: string | null;
  phone: string | null;
  walletAddress: string | null;
  bio: string | null;
  languages: string[];
  ratingAvg: number;
  ratingCount: number;
  isVetted: boolean;
  createdAt: string | null;
}

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProfile(row: any): Profile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    walletAddress: row.wallet_address,
    bio: row.bio,
    languages: row.languages ?? [],
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: row.rating_count ?? 0,
    isVetted: Boolean(row.is_vetted),
    createdAt: row.created_at ?? null,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(
    async (userId: string) => {
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (data) {
          setProfile(toProfile(data));
          return;
        }
        await sleep(200 * (attempt + 1));
      }
      setProfile(null);
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setLoading(true);
      setSession(newSession);
      if (newSession) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      setSession(data.session);
      await loadProfile(data.session.user.id);
    }
  }, [supabase, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ loading, user: session?.user ?? null, session, profile, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function firstNameFromProfile(profile: Profile | null, email?: string | null) {
  const name = profile?.fullName?.trim();
  if (name) return name.split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "there";
}
