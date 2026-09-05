"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ExperiencePhotoStrip, experiencePhotoUrls } from "@/components/ui/ExperiencePhotoStrip";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { EXPERIENCE_CATEGORIES } from "@/lib/categories";
import { RatePanel } from "@/components/RatePanel";
import { ViewTouristProfileButton } from "@/components/ViewTouristProfileButton";
import { listMyBookings, getGuideInsights, submitTouristRating, type BookingRecord, type GuideInsights } from "@/lib/api";
import { Price } from "@/lib/fx";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { WalletPanel } from "@/components/WalletPanel";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { getExperienceSharePath, getStreamSharePath } from "@/lib/share";
import { useToast } from "@/components/ui/Toast";

type DashboardTab = "experiences" | "insights" | "wallet";

interface ExperienceRow {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  price_usdc: number;
  duration_minutes: number;
  location: string | null;
  image_url: string | null;
  image_urls: string[];
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

async function uploadExperiencePhotos(files: File[], guideId: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadExperiencePhoto(file, guideId));
  }
  return urls;
}

export default function GuideDashboardPage() {
  const router = useRouter();
  const { loading: authLoading, session, profile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>("experiences");

  const [guideBookings, setGuideBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [insights, setInsights] = useState<GuideInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [savingExperience, setSavingExperience] = useState(false);
  const [experienceError, setExperienceError] = useState<string | null>(null);

  const [photoUpdatingId, setPhotoUpdatingId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (session) void loadExperiences(session.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session || activeTab !== "insights") return;
    setLoadingInsights(true);
    setInsightsError(null);
    getGuideInsights(session.access_token)
      .then(({ insights: data }) => setInsights(data))
      .catch((err) => setInsightsError((err as Error).message))
      .finally(() => setLoadingInsights(false));
  }, [session, activeTab]);

  useEffect(() => {
    if (window.location.hash === "#settings") {
      router.replace("/guide/settings");
    }
  }, [router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function refresh() {
      try {
        const { bookings } = await listMyBookings(session!.access_token);
        if (cancelled) return;
        setGuideBookings(bookings.filter((b) => b.guideId === session!.user.id));
        setBookingsError(null);
      } catch (err) {
        if (!cancelled) setBookingsError((err as Error).message);
      } finally {
        if (!cancelled) setLoadingBookings(false);
      }
    }

    refresh();
    const interval = setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session]);

  async function loadExperiences(guideId: string) {
    setLoadingExperiences(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("experiences")
      .select("id, title, description, tags, category, price_usdc, duration_minutes, location, image_url, image_urls, is_active")
      .eq("guide_id", guideId)
      .order("created_at", { ascending: false });
    setExperiences((data as ExperienceRow[]) ?? []);
    setLoadingExperiences(false);
  }

  function handleImageFilesSelected(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    setImageFiles(files);
    setImagePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return files.map((file) => URL.createObjectURL(file));
    });
  }

  async function handleCreateExperience(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSavingExperience(true);
    setExperienceError(null);
    try {
      const imageUrls = imageFiles.length > 0 ? await uploadExperiencePhotos(imageFiles, session.user.id) : [];

      const supabase = createClient();
      const { error } = await supabase.from("experiences").insert({
        guide_id: session.user.id,
        title,
        description,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        category: category || null,
        price_usdc: Number(price),
        duration_minutes: Number(duration),
        location: location || null,
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls,
      });
      if (error) throw error;
      setTitle("");
      setDescription("");
      setTags("");
      setCategory("");
      setPrice("");
      setDuration("");
      setLocation("");
      handleImageFilesSelected(null);
      setShowForm(false);
      await loadExperiences(session.user.id);
      toast("Experience published", "success");
    } catch (err) {
      setExperienceError((err as Error).message);
    } finally {
      setSavingExperience(false);
    }
  }

  async function handlePhotosAdd(exp: ExperienceRow, fileList: FileList | null) {
    if (!session || !fileList?.length) return;
    setPhotoError(null);
    setPhotoUpdatingId(exp.id);
    try {
      const newUrls = await uploadExperiencePhotos(Array.from(fileList), session.user.id);
      const existing = exp.image_urls?.length ? exp.image_urls : exp.image_url ? [exp.image_url] : [];
      const deduped = [...new Set([...existing, ...newUrls])];
      const supabase = createClient();
      const { error } = await supabase
        .from("experiences")
        .update({ image_urls: deduped, image_url: deduped[0] ?? null })
        .eq("id", exp.id);
      if (error) throw error;
      await loadExperiences(session.user.id);
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setPhotoUpdatingId(null);
    }
  }

  async function handleCategoryChange(exp: ExperienceRow, newCategory: string) {
    if (!session) return;
    const supabase = createClient();
    await supabase
      .from("experiences")
      .update({ category: newCategory || null })
      .eq("id", exp.id);
    await loadExperiences(session.user.id);
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

  const upcoming = guideBookings.filter((b) => b.status === "locked");
  const pastBookings = guideBookings.filter((b) => b.status !== "locked");

  return (
    <div className="flex flex-col gap-6">
      <MobilePageBanner eyebrow="Dashboard" title="Your listings and payouts" />
      <div className="hidden flex-wrap items-center justify-between gap-4 md:flex">
        <div className="flex gap-2">
          <Link
            href="/guide"
            className="rounded-full border border-brand-border px-4 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-accent hover:text-brand-accent"
          >
            Active tour
          </Link>
          <span className="rounded-full bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white">Dashboard</span>
          <Link
            href="/live"
            className="rounded-full border border-brand-border px-4 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-accent hover:text-brand-accent"
          >
            Go live
          </Link>
        </div>
      </div>

      {upcoming.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-brand-blueDark">Booked tours</h2>
              <p className="text-sm text-brand-muted">
                A tourist has paid. Open Active tour to enter their PIN or scan their QR.
              </p>
            </div>
            <Link href="/guide">
              <Button variant="primary">Enter PIN / scan QR</Button>
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {upcoming.map((b) => (
              <div
                key={b.bookingId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-border p-3 max-md:rounded-3xl"
              >
                <div>
                  <p className="font-semibold text-brand-blueDark">{b.touristName?.trim() || "Guest"}</p>
                  {b.touristPhone && (
                    <a href={`tel:${b.touristPhone}`} className="text-sm font-semibold text-brand-accent">
                      {b.touristPhone}
                    </a>
                  )}
                  {b.touristRatingCount > 0 && (
                    <StarRating value={b.touristRatingAvg} count={b.touristRatingCount} className="mt-1" />
                  )}
                  <p className="text-xs text-brand-muted">
                    {b.touristCompletedTripCount} {b.touristCompletedTripCount === 1 ? "trip" : "trips"}
                    {b.touristLanguages?.length ? ` · ${b.touristLanguages.join(", ")}` : ""}
                  </p>
                  {b.touristBio && <p className="mt-1 text-sm text-brand-muted line-clamp-2">{b.touristBio}</p>}
                  <p className="text-xs text-brand-muted">
                    {b.experienceTitle ?? "Experience"} · <Price amountUsdc={b.amountUsdc} size="sm" align="start" className="inline-flex" />
                  </p>
                  {b.touristId && <ViewTouristProfileButton touristId={b.touristId} className="mt-2 inline-block" />}
                </div>
                <Chip tone={b.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <TabButton active={activeTab === "experiences"} onClick={() => setActiveTab("experiences")}>
          Experiences
        </TabButton>
        <TabButton active={activeTab === "insights"} onClick={() => setActiveTab("insights")}>
          Insights
        </TabButton>
        <TabButton active={activeTab === "wallet"} onClick={() => setActiveTab("wallet")}>
          Wallet
        </TabButton>
      </div>

      {activeTab === "experiences" && (
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
          <form className="mt-4 grid gap-3 rounded-lg bg-brand-bg p-4 max-md:rounded-3xl sm:grid-cols-2" onSubmit={handleCreateExperience}>
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
            <Field label="Category">
              <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Uncategorized</option>
                {EXPERIENCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
              <Field label="Photos">
                <div className="flex flex-col gap-3">
                  {imagePreviews.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {imagePreviews.map((preview, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={preview} src={preview} alt={`Preview ${i + 1}`} className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageFilesSelected(e.target.files)}
                    className="block w-full text-sm text-brand-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand-accent/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-accent hover:file:bg-brand-accent/20"
                  />
                </div>
                <p className="mt-1 text-xs text-brand-muted">
                  Add one or more photos. Hold Ctrl/Cmd to select multiple.
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
          {loadingExperiences && <ListRowSkeleton count={3} />}
          {!loadingExperiences && experiences.length === 0 && (
            <p className="text-sm text-brand-muted">You haven&apos;t published any experiences yet.</p>
          )}
          {experiences.map((exp) => (
            <div key={exp.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-border p-3 max-md:rounded-3xl">
              <div className="flex items-center gap-3">
                <ExperiencePhotoStrip urls={experiencePhotoUrls(exp)} alt={exp.title} />
                <div>
                  <p className="font-semibold text-brand-blueDark">{exp.title}</p>
                  <p className="text-xs text-brand-muted">
                    <span className="inline-flex items-baseline gap-2">
                      <Price amountUsdc={exp.price_usdc} size="sm" align="start" />
                      <span>
                        · {exp.duration_minutes} min{exp.location ? ` · ${exp.location}` : ""}
                      </span>
                    </span>
                  </p>
                  <label className="mt-1 inline-block cursor-pointer text-xs font-semibold text-brand-accent hover:underline">
                    {photoUpdatingId === exp.id ? "Uploading..." : "Add photos"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={photoUpdatingId === exp.id}
                      onChange={(e) => {
                        handlePhotosAdd(exp, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <select
                    className="mt-1 block rounded-full border border-brand-border bg-white px-2 py-0.5 text-xs text-brand-muted"
                    value={exp.category ?? ""}
                    onChange={(e) => handleCategoryChange(exp, e.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {EXPERIENCE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <ShareLinkButton
                  path={getExperienceSharePath(exp.id)}
                  label="Share"
                  shareTitle={exp.title}
                  shareText={`Book ${exp.title} on Guidemate`}
                  className="px-4 py-2 text-xs"
                />
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
      )}

      {activeTab === "wallet" && session && (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-lg font-bold text-brand-blueDark">Your wallet</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Earnings from tours and live streams land here. Withdraw to your M-Pesa number anytime.
            </p>
          </Card>
          <WalletPanel accessToken={session.access_token} canWithdraw phone={phone} />
        </div>
      )}

      {activeTab === "insights" && (
      <div className="flex flex-col gap-4">
        <Card>
          <div>
            <h2 className="text-lg font-bold text-brand-blueDark">Your performance</h2>
            <p className="text-sm text-brand-muted">Bookings, live streams, and earnings at a glance.</p>
          </div>

          {loadingInsights && !insights && <div className="mt-4"><ListRowSkeleton count={2} /></div>}
          {insightsError && <p className="mt-4 text-sm text-red-600">{insightsError}</p>}

          {insights && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InsightStat label="Confirmed bookings" value={insights.overview.confirmedBookings} />
              <InsightStat label="Completed tours" value={insights.overview.completedTours} />
              <InsightStat label="Past live streams" value={insights.overview.pastStreams} />
              <InsightStat label="Tour earnings" value={`${insights.overview.tourEarningsUsdc} USDC`} />
              <InsightStat label="Stream tips" value={`${insights.overview.streamEarningsUsdc} USDC`} />
              <InsightStat
                label="Rating"
                value={
                  insights.overview.ratingCount > 0
                    ? `${insights.overview.ratingAvg.toFixed(1)} (${insights.overview.ratingCount})`
                    : "No ratings yet"
                }
              />
            </div>
          )}
        </Card>

        {upcoming.length > 0 && (
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Confirmed bookings</h3>
            <p className="mt-1 text-sm text-brand-muted">Paid and waiting for the tour — open Active tour to verify.</p>
            <div className="mt-4 flex flex-col gap-3">
              {upcoming.map((b) => (
                <div
                  key={b.bookingId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-border p-3 max-md:rounded-3xl"
                >
                  <div>
                    <p className="font-semibold text-brand-blueDark">{b.experienceTitle ?? "Tour"}</p>
                    <p className="text-sm text-brand-muted">
                      {b.touristName?.trim() || "Guest"}
                      {b.touristPhone ? ` · ${b.touristPhone}` : ""}
                    </p>
                    <p className="text-xs text-brand-muted">
                      Booked {new Date(b.createdAt).toLocaleDateString()} ·{" "}
                      <Price amountUsdc={b.amountUsdc} size="sm" align="start" className="inline-flex" />
                    </p>
                  </div>
                  <Chip tone={b.status} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {insights && insights.upcomingStreams.length > 0 && (
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Upcoming live streams</h3>
            <div className="mt-4 flex flex-col gap-3">
              {insights.upcomingStreams.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-border p-3 max-md:rounded-3xl"
                >
                  <div>
                    <p className="font-semibold text-brand-blueDark">{s.title}</p>
                    {s.experienceTitle && <p className="text-sm text-brand-muted">{s.experienceTitle}</p>}
                    <p className="text-xs text-brand-muted">
                      {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "Scheduled"}
                      {s.priceUsdc > 0 ? (
                        <>
                          {" "}
                          · <Price amountUsdc={s.priceUsdc} size="sm" align="start" className="inline-flex" />
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ShareLinkButton
                      path={getStreamSharePath(s.id)}
                      label="Share"
                      shareTitle={s.title}
                      shareText={`Join my live stream: ${s.title}`}
                      className="px-4 py-2 text-xs"
                    />
                    <Link href={`/live/${s.id}`}>
                      <Button variant="secondary">Open</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {insights && insights.pastStreams.length > 0 && (
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Past live streams</h3>
            <div className="mt-4 flex flex-col gap-3">
              {insights.pastStreams.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-border p-3 max-md:rounded-3xl"
                >
                  <div>
                    <p className="font-semibold text-brand-blueDark">{s.title}</p>
                    {s.experienceTitle && <p className="text-sm text-brand-muted">{s.experienceTitle}</p>}
                    <p className="text-xs text-brand-muted">
                      {s.endedAt ? new Date(s.endedAt).toLocaleDateString() : new Date(s.createdAt).toLocaleDateString()}
                      {" · "}
                      {s.tipCount} tips ({s.tipTotalUsdc} USDC)
                      {" · "}
                      {s.reactionCount} flowers
                      {s.commentCount > 0 ? ` · ${s.commentCount} comments` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.recordingUrl && (
                      <a href={s.recordingUrl} target="_blank" rel="noreferrer">
                        <Button variant="secondary">Recording</Button>
                      </a>
                    )}
                    <ShareLinkButton
                      path={getStreamSharePath(s.id)}
                      label="Share"
                      shareTitle={s.title}
                      shareText={`Watch ${s.title} on Guidemate`}
                      className="px-4 py-2 text-xs"
                    />
                    <Link href={`/live/${s.id}`}>
                      <Button variant="secondary">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Past tours</h3>
            <p className="mt-1 text-sm text-brand-muted">Completed tours and payout status.</p>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {loadingBookings && <ListRowSkeleton count={3} />}
            {bookingsError && <p className="text-sm text-red-600">{bookingsError}</p>}
            {!loadingBookings && !bookingsError && pastBookings.length === 0 && (
              <p className="text-sm text-brand-muted">No completed tours yet — they&apos;ll show up here once verified.</p>
            )}
            {pastBookings.map((b) => (
            <div key={b.bookingId} className="rounded-lg border border-brand-border p-3 max-md:rounded-3xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-blueDark">{b.experienceTitle ?? b.request ?? "Tour"}</p>
                <p className="text-xs text-brand-muted">
                  {b.touristName?.trim() || "Guest"}
                  {b.touristPhone ? ` · ${b.touristPhone}` : ""}
                  {` · ${b.touristCompletedTripCount} ${b.touristCompletedTripCount === 1 ? "trip" : "trips"}`}
                </p>
                {b.touristLanguages?.length ? (
                  <p className="text-xs text-brand-muted">{b.touristLanguages.join(", ")}</p>
                ) : null}
                {b.touristBio && <p className="mt-1 text-sm text-brand-muted line-clamp-2">{b.touristBio}</p>}
                <p className="text-xs text-brand-muted">
                  {new Date(b.createdAt).toLocaleDateString()} ·{" "}
                  <Price amountUsdc={b.amountUsdc} size="sm" align="start" className="inline-flex" />
                  {b.splits ? ` · your cut ${b.splits.guideAmount} USDC` : ""}
                </p>
                {b.rating && (
                  <p className="mt-1 text-sm text-brand-amber" aria-label={`Rated ${b.rating.stars} stars`}>
                    {[1, 2, 3, 4, 5].map((n) => (n <= b.rating!.stars ? "★" : "☆")).join("")}
                    <span className="ml-1 text-xs text-brand-muted">from tourist</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Chip tone={b.status} />
                {b.status === "paid" && b.payout ? (
                  <p className="text-xs font-medium text-brand-success">
                    {b.payout.kesAmount} KES · Ref {b.payout.reference}
                  </p>
                ) : b.status === "refunded" && b.refund ? (
                  <p className="text-xs text-red-600">
                    No-show · {b.refund.refundAmount.toFixed(2)} USDC refunded
                  </p>
                ) : (
                  <p className="text-xs text-brand-muted">Payout not yet received</p>
                )}
              </div>
              </div>
              {b.status === "paid" && b.touristId && (
                <>
                <ViewTouristProfileButton touristId={b.touristId} className="mt-3 inline-block" />
                <RatePanel
                  title={`Rate ${b.touristName?.trim() || "this tourist"}`}
                  subtitle="How was this guest? Your rating helps other guides."
                  existing={b.touristRating}
                  placeholder="Optional: note how the trip went (visible to the tourist)"
                  onSubmit={async (stars, comment) => {
                    const { rating } = await submitTouristRating(
                      { bookingId: b.bookingId, stars, comment },
                      session.access_token
                    );
                    setGuideBookings((prev) =>
                      prev.map((row) => (row.bookingId === b.bookingId ? { ...row, touristRating: rating } : row))
                    );
                    return rating;
                  }}
                />
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
      </div>
      )}
    </div>
  );
}

function InsightStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-bg/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-blueDark">{value}</p>
    </div>
  );
}

const inputClass = "form-input-light";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand-blue text-white max-md:bg-brand-amber max-md:text-brand-blueDark" : "border border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-brand-blueDark">{label}</span>
      {children}
    </label>
  );
}
