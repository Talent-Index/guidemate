"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { StarRating } from "@/components/ui/StarRating";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

interface ExperienceRow {
  id: string;
  title: string;
  description: string;
  tags: string[];
  price_usdc: number;
  duration_minutes: number;
  location: string | null;
  image_url: string | null;
  is_active: boolean;
}

async function uploadExperiencePhoto(file: File, guideId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${guideId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("experience-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("experience-photos").getPublicUrl(path);
  return data.publicUrl;
}

export default function GuideDashboardPage() {
  const { loading: authLoading, session, profile, refreshProfile } = useAuth();
  const { address } = useAccount();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [savingExperience, setSavingExperience] = useState(false);
  const [experienceError, setExperienceError] = useState<string | null>(null);

  const [photoUpdatingId, setPhotoUpdatingId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setPhone(profile.phone ?? "");
      setBio(profile.bio ?? "");
      setLanguages(profile.languages.join(", "));
    }
  }, [profile]);

  useEffect(() => {
    if (session) void loadExperiences(session.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadExperiences(guideId: string) {
    setLoadingExperiences(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("experiences")
      .select("id, title, description, tags, price_usdc, duration_minutes, location, image_url, is_active")
      .eq("guide_id", guideId)
      .order("created_at", { ascending: false });
    setExperiences((data as ExperienceRow[]) ?? []);
    setLoadingExperiences(false);
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          bio,
          languages: languages
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean),
          wallet_address: address ?? profile?.walletAddress ?? null,
        })
        .eq("id", session.user.id);
      if (error) throw error;
      await refreshProfile();
      setProfileSaved(true);
    } catch (err) {
      setProfileError((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  function handleImageFileSelected(file: File | null) {
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function handleCreateExperience(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSavingExperience(true);
    setExperienceError(null);
    try {
      const imageUrl = imageFile ? await uploadExperiencePhoto(imageFile, session.user.id) : null;

      const supabase = createClient();
      const { error } = await supabase.from("experiences").insert({
        guide_id: session.user.id,
        title,
        description,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        price_usdc: Number(price),
        duration_minutes: Number(duration),
        location: location || null,
        image_url: imageUrl,
      });
      if (error) throw error;
      setTitle("");
      setDescription("");
      setTags("");
      setPrice("");
      setDuration("");
      setLocation("");
      handleImageFileSelected(null);
      setShowForm(false);
      await loadExperiences(session.user.id);
    } catch (err) {
      setExperienceError((err as Error).message);
    } finally {
      setSavingExperience(false);
    }
  }

  async function handlePhotoChange(exp: ExperienceRow, file: File | null) {
    if (!session || !file) return;
    setPhotoError(null);
    setPhotoUpdatingId(exp.id);
    try {
      const imageUrl = await uploadExperiencePhoto(file, session.user.id);
      const supabase = createClient();
      const { error } = await supabase.from("experiences").update({ image_url: imageUrl }).eq("id", exp.id);
      if (error) throw error;
      await loadExperiences(session.user.id);
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setPhotoUpdatingId(null);
    }
  }

  async function handleToggleActive(exp: ExperienceRow) {
    if (!session) return;
    const supabase = createClient();
    await supabase.from("experiences").update({ is_active: !exp.is_active }).eq("id", exp.id);
    await loadExperiences(session.user.id);
  }

  async function handleDelete(exp: ExperienceRow) {
    if (!session) return;
    const supabase = createClient();
    await supabase.from("experiences").delete().eq("id", exp.id);
    await loadExperiences(session.user.id);
  }

  if (authLoading) return null;

  if (!session || profile?.role !== "guide") {
    return (
      <div className="mx-auto max-w-md text-center">
        <Card>
          <h1 className="text-xl font-bold text-brand-blueDark">Guide sign-in required</h1>
          <p className="mt-2 text-sm text-brand-muted">Sign in with a guide account to manage your listings.</p>
          <Link href="/auth/sign-in">
            <Button variant="primary" className="mt-4">
              Sign in
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Link
            href="/guide"
            className="rounded-full border border-brand-border px-4 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-accent hover:text-brand-accent"
          >
            Active tour
          </Link>
          <span className="rounded-full bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white">Dashboard</span>
        </div>
        <WalletConnectButton />
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-brand-blueDark">Your guide profile</h1>
            <p className="mt-1 text-sm text-brand-muted">
              This is what tourists see, and where your M-Pesa payout number and on-chain wallet are set.
            </p>
          </div>
          <StarRating
            value={profile.ratingAvg}
            count={profile.ratingCount}
            size="md"
            className="rounded-full bg-brand-bg px-3 py-1.5"
          />
        </div>

        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSaveProfile}>
          <Field label="Full name">
            <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="M-Pesa phone number">
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254712345678"
              required
            />
          </Field>
          <Field label="Languages (comma separated)">
            <input
              className={inputClass}
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="English, Swahili"
            />
          </Field>
          <Field label="Payout wallet address">
            <input
              className={inputClass}
              value={address ?? profile?.walletAddress ?? ""}
              readOnly
              placeholder="Connect your wallet above"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Bio">
              <textarea className={inputClass} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
            </Field>
          </div>

          {profileError && <p className="text-sm text-red-600 sm:col-span-2">{profileError}</p>}
          {profileSaved && <p className="text-sm text-brand-success sm:col-span-2">Profile saved.</p>}

          <Button variant="primary" type="submit" disabled={savingProfile} className="w-fit sm:col-span-2">
            {savingProfile ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-brand-blueDark">Your experiences</h2>
            <p className="text-sm text-brand-muted">Tourists find these through search and AI matching.</p>
          </div>
          <Button variant="accent" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ New experience"}
          </Button>
        </div>

        {showForm && (
          <form className="mt-4 grid gap-3 rounded-lg bg-brand-bg p-4 sm:grid-cols-2" onSubmit={handleCreateExperience}>
            <Field label="Title">
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <Field label="Location">
              <input
                className={inputClass}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Nairobi CBD"
              />
            </Field>
            <Field label="Price (USDC)">
              <input
                className={inputClass}
                type="number"
                min="1"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </Field>
            <Field label="Duration (minutes)">
              <input
                className={inputClass}
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Tags (comma separated)">
                <input
                  className={inputClass}
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="street food, walking tours"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Photo">
                <div className="flex items-center gap-3">
                  {imagePreview && (
                    // Local blob preview only - next/image can't optimize blob: URLs, so a plain
                    // <img> is used here (the stored photo elsewhere always goes through ExperiencePhoto).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="Preview" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileSelected(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-brand-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand-accent/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-accent hover:file:bg-brand-accent/20"
                  />
                </div>
                <p className="mt-1 text-xs text-brand-muted">
                  Give tourists a clue what they&apos;re booking. Optional, can be added later.
                </p>
              </Field>
            </div>

            {experienceError && <p className="text-sm text-red-600 sm:col-span-2">{experienceError}</p>}

            <Button variant="primary" type="submit" disabled={savingExperience} className="w-fit sm:col-span-2">
              {savingExperience ? "Publishing..." : "Publish experience"}
            </Button>
          </form>
        )}

        {photoError && <p className="mt-3 text-sm text-red-600">{photoError}</p>}

        <div className="mt-4 flex flex-col gap-3">
          {loadingExperiences && <p className="text-sm text-brand-muted">Loading...</p>}
          {!loadingExperiences && experiences.length === 0 && (
            <p className="text-sm text-brand-muted">You haven&apos;t published any experiences yet.</p>
          )}
          {experiences.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between rounded-lg border border-brand-border p-3">
              <div className="flex items-center gap-3">
                <ExperiencePhoto src={exp.image_url} alt={exp.title} className="h-14 w-20 shrink-0 rounded-lg" />
                <div>
                  <p className="font-semibold text-brand-blueDark">{exp.title}</p>
                  <p className="text-xs text-brand-muted">
                    {exp.price_usdc} USDC · {exp.duration_minutes} min{exp.location ? ` · ${exp.location}` : ""}
                  </p>
                  <label className="mt-1 inline-block cursor-pointer text-xs font-semibold text-brand-accent hover:underline">
                    {photoUpdatingId === exp.id ? "Uploading..." : exp.image_url ? "Change photo" : "Add photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={photoUpdatingId === exp.id}
                      onChange={(e) => handlePhotoChange(exp, e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    exp.is_active ? "bg-brand-successBg text-brand-success" : "bg-brand-bg text-brand-muted"
                  }`}
                >
                  {exp.is_active ? "Active" : "Hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(exp)}
                  className="text-xs font-semibold text-brand-accent hover:underline"
                >
                  {exp.is_active ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(exp)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-brand-blueDark">{label}</span>
      {children}
    </label>
  );
}
