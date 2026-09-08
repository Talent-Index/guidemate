"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ExperiencePhotoStrip, experiencePhotoUrls } from "@/components/ui/ExperiencePhotoStrip";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth/AuthProvider";
import { RoleGate } from "@/components/auth/RoleGate";
import { GreetingRow } from "@/components/ui/GreetingRow";
import { createClient } from "@/lib/supabase/client";
import { EXPERIENCE_CATEGORIES } from "@/lib/categories";
import { RatePanel } from "@/components/RatePanel";
import { ViewTouristProfileButton } from "@/components/ViewTouristProfileButton";
import { getWallet, listMyBookings, getGuideInsights, submitTouristRating, type BookingRecord, type GuideInsights } from "@/lib/api";
import { Price } from "@/lib/fx";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { uploadExperiencePhoto } from "@/lib/uploads";
import { getExperienceSharePath, getStreamSharePath } from "@/lib/share";
import { WelcomeTodayCard, type WelcomeAction } from "@/components/WelcomeTodayCard";
import { compareExperiencesForDashboard, nextGapHint } from "@/lib/experiencePublish";
import type { ExperienceStatus } from "@/lib/experienceDraft";

type DashboardTab = "experiences" | "insights";

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
  itinerary: unknown;
  is_active: boolean;
  status: ExperienceStatus;
  wizard_step: number;
  meeting_lat: number | null;
  meeting_lng: number | null;
  meeting_label: string | null;
  created_at: string;
  futureSlotCount: number;
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

  const [activeTab, setActiveTab] = useState<DashboardTab>("experiences");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [guideBookings, setGuideBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [insights, setInsights] = useState<GuideInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);

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
    if (!session) {
      setWalletBalance(null);
      return;
    }
    getWallet(session.access_token)
      .then((wallet) => setWalletBalance(wallet.balanceUsdc))
      .catch(() => setWalletBalance(null));
  }, [session]);

  useEffect(() => {
    if (window.location.hash === "#settings") {
      router.replace("/guide/settings");
    }
    if (window.location.hash === "#guide-wallet") {
      router.replace("/wallet");
    }
    function syncTabFromHash() {
      const hash = window.location.hash;
      if (hash === "#guide-experiences") setActiveTab("experiences");
    }
    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
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
      .select(
        "id, title, description, tags, category, price_usdc, duration_minutes, location, image_url, image_urls, itinerary, is_active, status, wizard_step, meeting_lat, meeting_lng, meeting_label, created_at"
      )
      .eq("guide_id", guideId);

    const rows = (data ?? []) as Omit<ExperienceRow, "futureSlotCount">[];
    const slotCounts: Record<string, number> = {};

    if (rows.length > 0) {
      const { data: slots } = await supabase
        .from("experience_slots")
        .select("experience_id")
        .in("experience_id", rows.map((row) => row.id))
        .gte("starts_at", new Date().toISOString())
        .eq("is_cancelled", false);

      for (const slot of slots ?? []) {
        slotCounts[slot.experience_id] = (slotCounts[slot.experience_id] ?? 0) + 1;
      }
    }

    const withCounts: ExperienceRow[] = rows.map((row) => ({
      ...row,
      futureSlotCount: slotCounts[row.id] ?? 0,
    }));
    withCounts.sort(compareExperiencesForDashboard);
    setExperiences(withCounts);
    setLoadingExperiences(false);
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
    const label = exp.title.trim() || "this experience";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("experiences").delete().eq("id", exp.id);
    await loadExperiences(session.user.id);
  }

  if (authLoading || (session && !profile)) return <p className="text-sm text-brand-muted">LoadingÃÂ¢ÃÂÃÂ¦</p>;

  if (!session || profile?.role !== "guide") {
    return (
      <RoleGate
        role="guide"
        title="Guide sign-in required"
        body="Sign in with a guide account to manage your listings."
      />
    );
  }

  const upcoming = guideBookings.filter((b) => b.status === "locked");
  const pastBookings = guideBookings.filter((b) => b.status !== "locked");
  const activeListings = experiences.filter((exp) => exp.status === "published" && exp.is_active).length;

  const guideWelcomeActions: WelcomeAction[] = [
    ...(!profile.phone?.trim()
      ? [
          {
            label: "Complete your profile",
            description: "Add your M-Pesa number so you can get paid.",
            href: "/guide/settings",
          },
        ]
      : []),
    ...(!profile.walletAddress
      ? [
          {
            label: "Set up payout wallet",
            description: "Provision your on-chain wallet for earnings.",
            href: "/guide/settings",
          },
        ]
      : []),
    ...(experiences.length === 0
      ? [
          {
            label: "Publish your first experience",
            description: "Create a listing tourists can book.",
            href: "/guide/experiences/new",
          },
        ]
      : []),
    {
      label: "Check earnings",
      description: "View balance and withdraw to M-Pesa.",
      href: "/wallet",
    },
    ...(upcoming.length > 0
      ? [
          {
            label: "View booked tours",
            description: `${upcoming.length} paid ${upcoming.length === 1 ? "trip" : "trips"} waiting.`,
            href: "/guide",
          },
        ]
      : []),
    {
      label: "Go live or schedule",
      description: "Stream to tourists and earn tips.",
      href: "/live",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <MobilePageBanner eyebrow="Dashboard" title="Your listings and payouts" />
      <GreetingRow subtitle="Your listings, booked tours, and payouts in one place." />
      <div className="hidden grid-cols-3 gap-3 md:grid">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Active listings</p>
          <p className="mt-1 text-2xl font-bold text-brand-blueDark">{activeListings}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Locked bookings</p>
          <p className="mt-1 text-2xl font-bold text-brand-blueDark">{upcoming.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Wallet</p>
          {walletBalance == null ? (
            <p className="mt-1 text-sm text-brand-muted">ÃÂ¢ÃÂÃÂ</p>
          ) : (
            <Price amountUsdc={walletBalance} className="mt-1" align="start" size="lg" />
          )}
        </Card>
      </div>
      <WelcomeTodayCard profile={profile} actions={guideWelcomeActions} />

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
                className="flex flex-col gap-3 rounded-lg border border-brand-border p-3 max-md:rounded-3xl md:flex-row md:items-center md:justify-between"
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
                    {b.touristLanguages?.length ? ` ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ ${b.touristLanguages.join(", ")}` : ""}
                  </p>
                  {b.touristBio && <p className="mt-1 text-sm text-brand-muted line-clamp-2">{b.touristBio}</p>}
                  <p className="text-xs text-brand-muted">
                    {b.experienceTitle ?? "Experience"} ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ <Price amountUsdc={b.amountUsdc} size="sm" align="start" className="inline-flex" />
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
        <Link
          href="/wallet"
          className="rounded-full border border-brand-border px-4 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-accent hover:text-brand-accent"
        >
          Wallet
        </Link>
      </div>

      <div id="guide-experiences">
      {activeTab === "experiences" && (
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-brand-blueDark">Your experiences</h2>
            <p className="text-sm text-brand-muted">Tourists find these through search and AI matching.</p>
          </div>
          <Link href="/guide/experiences/new">
            <Button variant="accent">+ New experience</Button>
          </Link>
        </div>

        {photoError && <p className="mt-3 text-sm text-red-600">{photoError}</p>}

        <div className="mt-4 flex flex-col gap-3">
          {loadingExperiences && <ListRowSkeleton count={3} />}
          {!loadingExperiences && experiences.length === 0 && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-brand-muted">You haven&apos;t published any experiences yet.</p>
              <Link href="/guide/experiences/new">
                <Button variant="accent">+ New experience</Button>
              </Link>
            </div>
          )}
          {experiences.map((exp) => {
            const isDraft = exp.status === "draft";
            const displayTitle = exp.title.trim() || "Untitled experience";
            const gapHint = nextGapHint({
              title: exp.title,
              priceUsdc: exp.price_usdc,
              meetingLat: exp.meeting_lat,
              meetingLng: exp.meeting_lng,
              futureSlotCount: exp.futureSlotCount,
            });

            return (
              <div
                key={exp.id}
                className="flex flex-col gap-3 rounded-lg border border-brand-border p-3 max-md:rounded-3xl md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <ExperiencePhotoStrip urls={experiencePhotoUrls(exp)} alt={displayTitle} />
                  <div>
                    <p className="font-semibold text-brand-blueDark">{displayTitle}</p>
                    {isDraft ? (
                      <p className="text-xs text-brand-muted">{gapHint}</p>
                    ) : (
                      <p className="text-xs text-brand-muted">
                        <span className="inline-flex items-baseline gap-2">
                          <Price amountUsdc={exp.price_usdc} size="sm" align="start" />
                          <span>{exp.location ? ` · ${exp.location}` : ""}</span>
                        </span>
                      </p>
                    )}
                    {!isDraft && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {isDraft ? (
                    <>
                      <Chip tone="neutral" label="Incomplete" />
                      <Link
                        href={`/guide/experiences/${exp.id}/edit`}
                        className="text-xs font-semibold text-brand-accent hover:underline"
                      >
                        Continue setup
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(exp)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <ShareLinkButton
                        path={getExperienceSharePath(exp.id)}
                        label="Share"
                        shareTitle={displayTitle}
                        shareText={`Book ${displayTitle} on Guidemate`}
                        className="px-4 py-2 text-xs"
                      />
                      <Link
                        href={`/guide/experiences/${exp.id}/edit`}
                        className="text-xs font-semibold text-brand-accent hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/guide/experiences/${exp.id}/edit?step=6`}
                        className="text-xs font-semibold text-brand-accent hover:underline"
                      >
                        Add times
                      </Link>
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
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      )}
      </div>

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
            <p className="mt-1 text-sm text-brand-muted">Paid and waiting for the tour ÃÂÃÂÃÂÃÂÃÂÃÂ¶ open Active tour to verify.</p>
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
                      {b.touristPhone ? ` ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ ${b.touristPhone}` : ""}
                    </p>
                    <p className="text-xs text-brand-muted">
                      Booked {new Date(b.createdAt).toLocaleDateString()} ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ{" "}
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
                          ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ <Price amountUsdc={s.priceUsdc} size="sm" align="start" className="inline-flex" />
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
                      {" ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ "}
                      {s.tipCount} tips ({s.tipTotalUsdc} USDC)
                      {" ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ "}
                      {s.reactionCount} flowers
                      {s.commentCount > 0 ? ` ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ ${s.commentCount} comments` : ""}
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
              <p className="text-sm text-brand-muted">No completed tours yet ÃÂÃÂÃÂÃÂÃÂÃÂ¶ they&apos;ll show up here once verified.</p>
            )}
            {pastBookings.map((b) => (
            <div key={b.bookingId} className="rounded-lg border border-brand-border p-3 max-md:rounded-3xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-blueDark">{b.experienceTitle ?? b.request ?? "Tour"}</p>
                <p className="text-xs text-brand-muted">
                  {b.touristName?.trim() || "Guest"}
                  {b.touristPhone ? ` ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ ${b.touristPhone}` : ""}
                  {` ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ ${b.touristCompletedTripCount} ${b.touristCompletedTripCount === 1 ? "trip" : "trips"}`}
                </p>
                {b.touristLanguages?.length ? (
                  <p className="text-xs text-brand-muted">{b.touristLanguages.join(", ")}</p>
                ) : null}
                {b.touristBio && <p className="mt-1 text-sm text-brand-muted line-clamp-2">{b.touristBio}</p>}
                <p className="text-xs text-brand-muted">
                  {new Date(b.createdAt).toLocaleDateString()} ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ{" "}
                  <Price amountUsdc={b.amountUsdc} size="sm" align="start" className="inline-flex" />
                  {b.splits ? ` ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ your cut ${b.splits.guideAmount} USDC` : ""}
                </p>
                {b.rating && (
                  <p className="mt-1 text-sm text-brand-amber" aria-label={`Rated ${b.rating.stars} stars`}>
                    {[1, 2, 3, 4, 5].map((n) => (n <= b.rating!.stars ? "ÃÂÃÂÃÂÃÂ¿ÃÂÃÂ " : "ÃÂÃÂÃÂÃÂ¿ÃÂÃÂ¥")).join("")}
                    <span className="ml-1 text-xs text-brand-muted">from tourist</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Chip tone={b.status} />
                {b.status === "paid" && b.payout ? (
                  <p className="text-xs font-medium text-brand-success">
                    {b.payout.kesAmount} KES ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ Ref {b.payout.reference}
                  </p>
                ) : b.status === "refunded" && b.refund ? (
                  <p className="text-xs text-red-600">
                    No-show ÃÂ¢ÃÂÃÂ¬ÃÂ¢ÃÂÃÂ {b.refund.refundAmount.toFixed(2)} USDC refunded
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

