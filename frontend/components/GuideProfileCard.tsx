"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { provisionWallet } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export function GuideProfileCard() {
  const { session, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provisioningWallet, setProvisioningWallet] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName ?? "");
    setPhone(profile.phone ?? "");
    setBio(profile.bio ?? "");
    setLanguages(profile.languages.join(", "));
  }, [profile]);

  if (!session || profile?.role !== "guide") return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          bio,
          languages: languages
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean),
        })
        .eq("id", session!.user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast("Profile saved", "success");
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-brand-blueDark">Your guide profile</h2>
          <p className="mt-1 text-sm text-brand-muted">
            What tourists see, plus your M-Pesa payout number and on-chain wallet.
          </p>
        </div>
        <StarRating
          value={profile.ratingAvg}
          count={profile.ratingCount}
          size="md"
          className="rounded-full bg-brand-bg px-3 py-1.5"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-brand-border p-4 text-sm">
        <p className="font-semibold text-brand-blueDark">Terms</p>
        <p className="mt-2 text-brand-muted">
          Guidemate takes <span className="font-semibold text-brand-blueDark">15%</span> of your listed rate. You keep
          85% when the trip is completed. If a tourist cancels, the platform charges a{" "}
          <span className="font-semibold text-brand-blueDark">20% inconvenience fee</span>.
        </p>
        <Link href="/guide/terms" className="mt-2 inline-block font-semibold text-brand-accent">
          Read full guide terms
        </Link>
      </div>

      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
        <Field label="Full name">
          <input className="form-input-light" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </Field>
        <Field label="M-Pesa phone number">
          <input
            className="form-input-light"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254712345678"
            required
          />
        </Field>
        <Field label="Languages (comma separated)">
          <input
            className="form-input-light"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="English, Swahili"
          />
        </Field>
        <Field label="Payout wallet address">
          <input
            className="form-input-light"
            value={profile.walletAddress ?? ""}
            readOnly
            placeholder="Not provisioned yet"
          />
        </Field>
        {!profile.walletAddress && (
          <div className="sm:col-span-2">
            {provisionError && <p className="mb-2 text-sm text-red-600">{provisionError}</p>}
            <Button
              type="button"
              variant="secondary"
              disabled={provisioningWallet}
              onClick={async () => {
                setProvisioningWallet(true);
                setProvisionError(null);
                try {
                  await provisionWallet(session.access_token);
                  await refreshProfile();
                  toast("Wallet created", "success");
                } catch (err) {
                  const message = (err as Error).message;
                  setProvisionError(message);
                  toast(message, "error");
                } finally {
                  setProvisioningWallet(false);
                }
              }}
            >
              {provisioningWallet ? "Provisioning..." : "Provision wallet"}
            </Button>
          </div>
        )}
        <div className="sm:col-span-2">
          <Field label="Bio">
            <textarea className="form-input-light" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

        <Button variant="primary" type="submit" disabled={saving} className="w-fit sm:col-span-2">
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </form>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-brand-blueDark">{label}</span>
      {children}
    </label>
  );
}
