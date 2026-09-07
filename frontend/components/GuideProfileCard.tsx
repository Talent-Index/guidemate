"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { GuideAvatar } from "@/components/ui/GuideAvatar";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { provisionWallet } from "@/lib/api";
import { uploadGuideAvatar } from "@/lib/uploads";
import { useToast } from "@/components/ui/Toast";

export function GuideProfileCard() {
  const { session, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
    setAvatarUrl(profile.avatarUrl);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  if (!session || profile?.role !== "guide") return null;

  const email = session.user.email ?? "";
  const displayAvatar = avatarPreview ?? avatarUrl;

  function handleAvatarSelected(file: File | undefined) {
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        nextAvatarUrl = await uploadGuideAvatar(avatarFile, session!.user.id);
      }

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
          avatar_url: nextAvatarUrl,
        })
        .eq("id", session!.user.id);
      if (updateError) throw updateError;
      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(null);
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
    <SettingsSection title="Profile" description="What tourists see on your experiences, plus payout details.">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <GuideAvatar name={fullName || "Guide"} avatarUrl={displayAvatar} size="xl" />
          <div>
            <p className="text-sm font-medium text-brand-blueDark">Profile photo</p>
            <label className="mt-1 inline-block cursor-pointer text-sm font-semibold text-brand-accent hover:underline">
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarSelected(e.target.files?.[0])}
              />
            </label>
            <p className="mt-1 text-xs text-brand-muted">Shown on your experience pages and host card.</p>
          </div>
        </div>
        <StarRating
          value={profile.ratingAvg}
          count={profile.ratingCount}
          size="md"
          className="rounded-full bg-brand-bg px-3 py-1.5"
        />
      </div>

      <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
        <div className="sm:col-span-2">
          <Field label="Email">
            <input className="form-input-light bg-brand-bg" value={email} readOnly />
          </Field>
        </div>
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
            className="form-input-light bg-brand-bg"
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
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </SettingsSection>
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
