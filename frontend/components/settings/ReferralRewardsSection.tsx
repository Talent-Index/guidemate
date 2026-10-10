"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  claimReferralExperience,
  getReferralProgram,
  updateVanityReferralCode,
  type ReferralProgramResponse,
} from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";

export function ReferralRewardsSection() {
  const { session } = useAuth();
  const [data, setData] = useState<ReferralProgramResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimExperienceId, setClaimExperienceId] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vanityCode, setVanityCode] = useState("");
  const [savingVanity, setSavingVanity] = useState(false);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getReferralProgram(session.access_token);
      setData(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCopy() {
    if (!data?.links.apply) return;
    try {
      await navigator.clipboard.writeText(data.links.apply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link. Select and copy manually.");
    }
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token || !claimExperienceId.trim()) return;
    setClaiming(true);
    setError(null);
    try {
      await claimReferralExperience(claimExperienceId.trim(), session.access_token);
      setClaimExperienceId("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClaiming(false);
    }
  }

  const summary = data?.summary;

  return (
    <SettingsSection
      title="Refer a guide"
      description="Share your link so friends apply as guides. When they are approved and list an experience, you earn XP toward a complimentary trip."
    >
      {loading && <p className="text-sm text-brand-muted">Loading referral stats…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {summary && (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Your XP</p>
              <p className="text-2xl font-bold text-brand-blueDark">{summary.referralXp}</p>
              <p className="text-xs text-brand-muted">
                {summary.xpPerQualifiedGuide} XP per qualified guide · {summary.xpToClaimExperience} XP to claim an
                experience
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
                {copied ? "Copied!" : "Copy apply link"}
              </Button>
              <Link href="/refer-a-guide">
                <Button type="button" variant="primary">Campaign page</Button>
              </Link>
            </div>
          </div>

          {data.links && (
            <p className="break-all font-mono text-xs text-brand-muted">{data.links.apply}</p>
          )}

          <form
            className="space-y-2 border-t border-brand-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!session?.access_token || !vanityCode.trim()) return;
              setSavingVanity(true);
              setError(null);
              updateVanityReferralCode(vanityCode.trim(), session.access_token)
                .then((res) => {
                  setData(res);
                  setVanityCode("");
                })
                .catch((err) => setError((err as Error).message))
                .finally(() => setSavingVanity(false));
            }}
          >
            <p className="font-semibold text-brand-blueDark">Custom referral code</p>
            <p className="text-xs text-brand-muted">
              Current code: <span className="font-mono font-semibold">{summary.referralCode}</span> (4–24 letters,
              numbers, - or _)
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={vanityCode}
                onChange={(e) => setVanityCode(e.target.value)}
                placeholder="e.g. IMMACULATE"
                className="min-w-[200px] flex-1 rounded-lg border border-brand-border px-3 py-2 text-sm"
              />
              <Button type="submit" variant="secondary" disabled={savingVanity || !vanityCode.trim()}>
                {savingVanity ? "Saving…" : "Set code"}
              </Button>
            </div>
          </form>

          {summary.referrals.length > 0 && (
            <div>
              <p className="font-semibold text-brand-blueDark">Your referrals</p>
              <ul className="mt-2 space-y-2">
                {summary.referrals.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2 border-b border-brand-border pb-2">
                    <span>{r.referredGuideName ?? "Guide applicant"}</span>
                    <span className="text-brand-muted">
                      {r.status === "qualified" ? `+${r.xpAwarded} XP` : r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.canClaimExperience && (
            <form onSubmit={(e) => void handleClaim(e)} className="space-y-2 border-t border-brand-border pt-4">
              <p className="font-semibold text-brand-blueDark">Claim an experience</p>
              <p className="text-brand-muted">
                Pick a published experience from{" "}
                <Link href="/explore" className="text-brand-accent underline">Explore</Link>, copy its ID from the URL,
                and submit. Guidemate covers the bill after we approve the claim.
              </p>
              <input
                type="text"
                value={claimExperienceId}
                onChange={(e) => setClaimExperienceId(e.target.value)}
                placeholder="Experience UUID"
                className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={claiming || !claimExperienceId.trim()}>
                {claiming ? "Submitting…" : `Claim (${summary.xpToClaimExperience} XP)`}
              </Button>
            </form>
          )}

          {summary.claims.length > 0 && (
            <div>
              <p className="font-semibold text-brand-blueDark">Reward claims</p>
              <ul className="mt-2 space-y-1 text-brand-muted">
                {summary.claims.map((c) => (
                  <li key={c.id}>
                    {c.experienceTitle ?? c.experienceId} · {c.status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  );
}
