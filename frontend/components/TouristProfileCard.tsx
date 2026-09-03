"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

/** Lets a tourist keep the details guides see: name, phone, languages, and a short bio. */
export function TouristProfileCard() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName ?? "");
    setPhone(profile.phone ?? "");
    setBio(profile.bio ?? "");
    setLanguages(profile.languages.join(", "));
  }, [profile]);

  if (!session || profile?.role !== "tourist") return null;

  const userId = session.user.id;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
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
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-brand-blueDark">Your profile</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Guides see this after you book: how to reach you, languages, and a bit about you.
      </p>
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
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
        {saved && <p className="text-sm text-brand-success sm:col-span-2">Profile saved.</p>}
        <div className="sm:col-span-2">
          <Button variant="secondary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
