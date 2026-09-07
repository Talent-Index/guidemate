"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

/** Lets a tourist keep the details guides see: name, phone, languages, and a short bio. */
export function TouristProfileCard() {
  const { session, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName ?? "");
    setPhone(profile.phone ?? "");
    setBio(profile.bio ?? "");
    setLanguages(profile.languages.join(", "));
  }, [profile]);

  if (!session || profile?.role !== "tourist") return null;

  const userId = session.user.id;
  const email = session.user.email ?? "";

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
          phone: phone || null,
          bio: bio.trim() || null,
          languages: languages
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean),
        })
        .eq("id", userId);
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
    <SettingsSection title="Profile" description="Guides see this after you book.">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-brand-blueDark">Email</span>
          <input className="form-input-light bg-brand-bg" value={email} readOnly />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-brand-blueDark">Full name</span>
          <input className="form-input-light" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-brand-blueDark">Phone</span>
          <input
            className="form-input-light"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254712345678"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-brand-blueDark">Languages (comma separated)</span>
          <input
            className="form-input-light"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="English, Swahili, French"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-brand-blueDark">About you</span>
          <textarea
            className="form-input-light resize-none"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Interests, accessibility needs, who you're travelling with..."
          />
        </label>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
