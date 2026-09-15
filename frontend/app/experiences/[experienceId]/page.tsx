"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ExperiencePhotoGallery } from "@/components/experience/ExperiencePhotoGallery";
import { ExperienceBookingPanel } from "@/components/experience/ExperienceBookingPanel";
import { GuestCountModal } from "@/components/experience/GuestCountModal";
import { ExperienceThingsToKnow } from "@/components/experience/ExperienceThingsToKnow";
import { ExperienceMetaList } from "@/components/experience/ExperienceMetaList";
import { ExperienceWhatYoullDo } from "@/components/experience/ExperienceWhatYoullDo";
import { normalizeItinerary } from "@/lib/itinerary";
import { ExperienceRow } from "@/components/experience/ExperienceRow";
import type { ExperienceCardData } from "@/components/experience/ExperienceCard";
import { GuideAboutModal } from "@/components/experience/GuideAboutModal";
import { MessageGuideModal } from "@/components/experience/MessageGuideModal";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { experiencePhotoUrls } from "@/components/ui/ExperiencePhotoStrip";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getExperienceSharePath } from "@/lib/share";
import { isUuid, slugify } from "@/lib/slug";
import { Price } from "@/lib/fx";
import type { ExperienceSlot } from "@/lib/slots";

interface ExperienceDetail {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  price_usdc: number;
  duration_minutes: number;
  location: string | null;
  meeting_lat: number | null;
  meeting_lng: number | null;
  meeting_label: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  itinerary: unknown;
  guide_id: string;
  guide: {
    id: string;
    slug: string | null;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
    languages: string[];
    rating_avg: number;
    rating_count: number;
    is_vetted: boolean;
  } | null;
}

interface ReviewRow {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  tourist: { full_name: string } | null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function tagline(description: string) {
  const first = description.split(/\n/)[0]?.trim() ?? "";
  if (first.length <= 120) return first;
  return `${first.slice(0, 117)}...`;
}

function osmEmbedSrc(lat: number, lng: number) {
  const d = 0.08;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function decodeIdOrSlug(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function ExperienceDetailClient({ idOrSlug }: { idOrSlug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [moreFromGuide, setMoreFromGuide] = useState<ExperienceCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ExperienceSlot | null>(null);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [slotRefreshKey, setSlotRefreshKey] = useState(0);

  function handleGuestConfirm(adults: number, children: number) {
    if (!experience || !selectedSlot) return;
    setGuestModalOpen(false);
    setSlotRefreshKey((k) => k + 1);
    const params = new URLSearchParams({
      slot: selectedSlot.id,
      adults: String(adults),
      children: String(children),
    });
    router.push(`/book/${experience.id}?${params.toString()}`);
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const select =
        "id, slug, guide_id, title, description, tags, category, price_usdc, duration_minutes, location, meeting_lat, meeting_lng, meeting_label, image_url, image_urls, itinerary, guide:guide_id ( id, slug, full_name, bio, avatar_url, languages, rating_avg, rating_count, is_vetted )";
      const published = () =>
        supabase.from("experiences").select(select).eq("status", "published").eq("is_active", true);
      const raw = decodeIdOrSlug(idOrSlug);

      let data: unknown = null;
      let loadError: { message?: string } | null = null;
      if (isUuid(raw)) {
        const result = await published().eq("id", raw).maybeSingle();
        data = result.data;
        loadError = result.error;
      } else {
        const exact = await published().eq("slug", raw).maybeSingle();
        data = exact.data;
        loadError = exact.error;
        if (!data) {
          const guessed = slugify(raw);
          if (guessed && guessed !== raw) {
            const fallback = await published().eq("slug", guessed).maybeSingle();
            data = fallback.data;
            loadError = fallback.error;
          }
        }
      }

      if (loadError || !data) {
        setError("Experience not found.");
        setLoading(false);
        return;
      }

      const row = data as unknown as ExperienceDetail;
      setExperience(row);
      if (row.slug && (pathname.startsWith("/experiences/") || decodeIdOrSlug(idOrSlug) !== row.slug)) {
        router.replace(`/e/${encodeURIComponent(row.slug)}`);
      }

      if (row.guide?.id) {
        const [{ data: ratingRows }, { data: otherExps }] = await Promise.all([
          supabase
            .from("ratings")
            .select("id, stars, comment, created_at, tourist:tourist_id ( full_name )")
            .eq("guide_id", row.guide.id)
            .order("created_at", { ascending: false })
            .limit(6),
          supabase
            .from("experiences")
            .select("id, slug, title, price_usdc, image_url, category, guide:guide_id ( full_name, rating_avg, rating_count )")
            .eq("status", "published")
            .eq("is_active", true)
            .neq("id", row.id)
            .order("created_at", { ascending: false })
            .limit(12),
        ]);
        setReviews((ratingRows as unknown as ReviewRow[]) ?? []);
        setMoreFromGuide((otherExps as unknown as ExperienceCardData[]) ?? []);
      }

      setLoading(false);
    })();
  }, [idOrSlug, pathname, router]);

  if (loading) return <p className="text-sm text-brand-muted">Loading...</p>;

  if (error || !experience) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm text-red-600">{error ?? "Not found"}</p>
        <Link href="/explore">
          <Button variant="secondary" className="mt-4">Back to Explore</Button>
        </Link>
      </div>
    );
  }

  const guide = experience.guide;
  const photos = experiencePhotoUrls(experience);
  const hasPin = experience.meeting_lat != null && experience.meeting_lng != null;
  const meetingPlaceName = experience.meeting_label ?? experience.location;
  const hours =
    experience.duration_minutes > 0
      ? Math.round((experience.duration_minutes / 60) * 10) / 10
      : null;
  const itinerarySteps = normalizeItinerary(experience.itinerary, photos);
  const guideRole = guide?.is_vetted ? "Vetted local guide" : "Local guide";

  return (
    <div className="mx-auto max-w-[1120px] pb-28 lg:pb-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
        <ExperiencePhotoGallery urls={photos} alt={experience.title} layout="quad" />

        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[26px] font-bold leading-tight text-[var(--gm-ink)] sm:text-[32px]">
              {experience.title}
            </h1>
            <ShareLinkButton
              path={getExperienceSharePath(experience.id, experience.slug)}
              label="Share"
              shareTitle={experience.title}
              shareText={`Book ${experience.title} on Guidemate`}
              variant="outline"
              className="shrink-0 rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <p className="mt-2 text-base text-brand-muted">{tagline(experience.description)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-muted">
            {guide && guide.rating_count > 0 && (
              <StarRating value={guide.rating_avg} count={guide.rating_count} size="md" />
            )}
            {experience.location && <span>{experience.location}</span>}
            {experience.category && <span>· {experience.category}</span>}
          </div>

          {guide && (
            <div className="mt-6">
              <ExperienceMetaList
                guideName={guide.full_name}
                guideRole={guideRole}
                guideAvatarUrl={guide.avatar_url}
                location={meetingPlaceName ?? experience.location}
                durationHours={hours}
                languages={guide.languages}
                onHostClick={() => setAboutOpen(true)}
              />
            </div>
          )}

          <div className="mt-6 hidden lg:block">
            <ExperienceBookingPanel
              priceUsdc={experience.price_usdc}
              experienceId={experience.id}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              onReserve={() => setGuestModalOpen(true)}
              slotRefreshKey={slotRefreshKey}
            />
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex flex-col gap-10">
          {itinerarySteps.length > 0 && <ExperienceWhatYoullDo steps={itinerarySteps} />}

          {itinerarySteps.length === 0 && (
            <section>
              <h2 className="text-[22px] font-bold text-[var(--gm-ink)]">About this experience</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{experience.description}</p>
            </section>
          )}

          {reviews.length > 0 && guide && (
            <section>
              <div className="flex flex-wrap items-center gap-3">
                <StarRating value={guide.rating_avg} count={guide.rating_count} size="md" showCount={false} />
                <span className="text-sm text-brand-muted">
                  {guide.rating_count} {guide.rating_count === 1 ? "review" : "reviews"}
                </span>
              </div>
              <div className="mt-6 grid gap-8 sm:grid-cols-2">
                {reviews.map((review) => (
                  <div key={review.id}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-xs font-bold">
                        {initials(review.tourist?.full_name ?? "Guest")}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--gm-ink)]">{review.tourist?.full_name ?? "Guest"}</p>
                        <p className="text-xs text-brand-muted">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <StarRating value={review.stars} count={1} size="sm" showCount={false} className="mt-2" />
                    {review.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-brand-muted">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-[22px] font-bold text-[var(--gm-ink)]">Where we&apos;ll meet</h2>
            {hasPin ? (
              <>
                {meetingPlaceName && (
                  <p className="mt-2 font-semibold text-[var(--gm-ink)]">{meetingPlaceName}</p>
                )}
                <div className="mt-4 overflow-hidden rounded-2xl border border-brand-border">
                  <iframe
                    title="Meeting location map"
                    className="h-80 w-full border-0"
                    loading="lazy"
                    src={osmEmbedSrc(experience.meeting_lat!, experience.meeting_lng!)}
                  />
                </div>
              </>
            ) : (
              experience.location && (
                <p className="mt-2 text-sm text-brand-muted">{experience.location}</p>
              )
            )}
          </section>

          {moreFromGuide.length > 0 && (
            <ExperienceRow title="More experiences in Nairobi" experiences={moreFromGuide} />
          )}
        </div>

        <aside className="hidden lg:block" />
      </div>

      <div id="experience-times-mobile" className="mt-10 lg:hidden">
        <ExperienceBookingPanel
          priceUsdc={experience.price_usdc}
          experienceId={experience.id}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onReserve={() => setGuestModalOpen(true)}
          slotRefreshKey={slotRefreshKey}
          compact
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-[var(--gm-surface)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div>
            <Price amountUsdc={experience.price_usdc} size="md" align="start" className="font-bold" />
            <p className="text-xs text-brand-muted">/ guest</p>
          </div>
          {selectedSlot ? (
            <Button variant="accent" className="rounded-full px-6" onClick={() => setGuestModalOpen(true)}>
              Reserve
            </Button>
          ) : (
            <a href="#experience-times-mobile">
              <Button variant="accent" className="rounded-full px-6">Show dates</Button>
            </a>
          )}
        </div>
      </div>

      {guide && (
        <>
          <GuideAboutModal
            open={aboutOpen}
            onClose={() => setAboutOpen(false)}
            onMessage={() => setMessageOpen(true)}
            guide={guide}
          />
          <MessageGuideModal
            open={messageOpen}
            onClose={() => setMessageOpen(false)}
            guideName={guide.full_name}
            experienceTitle={experience.title}
            guideId={guide.id}
            guideSlug={guide.slug}
            signedIn={Boolean(session)}
          />
        </>
      )}

      {selectedSlot && (
        <GuestCountModal
          open={guestModalOpen}
          onClose={() => setGuestModalOpen(false)}
          priceUsdc={experience.price_usdc}
          maxGuests={selectedSlot.max_guests}
          onConfirm={handleGuestConfirm}
        />
      )}
    </div>
  );
}

export default function ExperienceDetailPage() {
  const params = useParams<{ experienceId: string }>();
  const idOrSlug = params.experienceId;
  if (!idOrSlug) {
    return <p className="text-sm text-brand-muted">Loading...</p>;
  }
  return <ExperienceDetailClient idOrSlug={idOrSlug} />;
}
