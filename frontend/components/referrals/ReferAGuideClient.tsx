"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getReferralProgram, type ReferralProgramResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";

export function ReferAGuideClient() {
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = useState<ReferralProgramResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      setData(await getReferralProgram(session.access_token));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCopy() {
    if (!data?.links.apply) return;
    await navigator.clipboard.writeText(data.links.apply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (authLoading) {
    return <p className="mt-8 text-sm text-brand-muted">Loading…</p>;
  }

  if (!session) {
    return (
      <div className="mt-8 rounded-xl border border-brand-border bg-[var(--gm-canvas)] p-6">
        <p className="text-sm text-brand-muted">Sign in to get your referral link and track XP.</p>
        <Link href="/auth/sign-in" className="mt-4 inline-block">
          <Button variant="primary">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-brand-border bg-[var(--gm-canvas)] p-6">
      {loading && <p className="text-sm text-brand-muted">Loading your link…</p>}
      {data && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Your code</p>
            <p className="font-mono text-lg font-bold text-brand-blueDark">{data.summary.referralCode}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Referral XP</p>
            <p className="text-2xl font-bold text-brand-blueDark">{data.summary.referralXp}</p>
          </div>
          <p className="break-all font-mono text-xs text-brand-muted">{data.links.apply}</p>
          <p className="text-xs text-brand-muted">Short link: {data.links.short}</p>
          <Button type="button" variant="primary" onClick={() => void handleCopy()}>
            {copied ? "Copied apply link" : "Copy link for your friend"}
          </Button>
        </div>
      )}
    </div>
  );
}
