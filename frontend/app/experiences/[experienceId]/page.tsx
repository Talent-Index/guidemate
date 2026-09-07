"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExperiencePhotoGallery } from "@/components/experience/ExperiencePhotoGallery";
import { ExperienceBookingPanel } from "@/components/experience/ExperienceBookingPanel";
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
import { Price } from "@/lib/fx";
import type { ExperienceSlot } from "@/lib/slots";

interface ExperienceDetail {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  price_usdc: number;
  duration_minutes: number;
  location: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  itinerary: unknown;
  guide_id: string;
  guide: {
    id: string;
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

export default function ExperienceDetailPage() {
  const params = useParams<{ experienceId: string }>();
  const { session } = useAuth();
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [moreFromGuide, setMoreFromGuide] = useState<ExperienceCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ExperienceSlot | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error: loadError } = await supabase
        .from("experiences")
        .select(
          "id, guide_id, title, description, tags, category, price_usdc, duration_minutes, location, image_url, image_urls, itinerary, guide:guide_id ( id, full_name, bio, avatar_url, languages, rating_avg, rating_count, is_vetted )"
        )
        .eq("id", params.experienceId)
        .eq("is_active", true)
        .maybeSingle();

      if (loadError || !data) {
        setError("Experience not found.");
        setLoading(false);
        return;
      }

      const row = data as unknown as ExperienceDetail;
      setExperience(row);

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
            .select("id, title, price_usdc, image_url, category, guide:guide_id ( full_name, rating_avg, rating_count )")
            .eq("guide_id", row.guide_id)
            .eq("is_active", true)
            .neq("id", row.id)
            .order("created_at", { ascending: false })
            .limit(8),
        ]);
        setReviews((ratingRows as unknown as ReviewRow[]) ?? []);
        setMoreFromGuide((otherExps as unknown as ExperienceCardData[]) ?? []);
      }

      setLoading(false);
    })();
  }, [params.experienceId]);

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
  const mapQuery = encodeURIComponent(experience.location ?? "Nairobi, Kenya");
  const hours = Math.round((experience.duration_minutes / 60) * 10) / 10;
  const itinerarySteps = normalizeItinerary(experience.itinerary, photos);
  const guideRole = guide?.is_vetted ? "Vetted local guide" : "Local guide";

  return (
    <div className="mx-auto max-w-[1120px] pb-28 lg:pb-16">
      <div className="mb-6">
        <ExperiencePhotoGallery urls={photos} alt={experience.title} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border pb-6">
        <div className="max-w-2xl">
          <h1 className="text-[26px] font-bold leading-tight text-[var(--gm-ink)] sm:text-[32px]">
            {experience.title}
          </h1>
          <p className="mt-2 text-base text-brand-muted">{tagline(experience.description)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {guide && guide.rating_count > 0 && (
              <StarRating value={guide.rating_avg} count={guide.rating_count} size="md" />
            )}
            {experience.location && (
              <span className="text-brand-muted">
                {guide && guide.rating_count > 0 ? "· " : ""}
                {experience.location}
              </span>
            )}
            {experience.category && (
              <span className="text-brand-muted">· {experience.category}</span>
            )}
          </div>
        </div>
        <ShareLinkButton
          path={getExperienceSharePath(experience.id)}
          label="Share"
          shareTitle={experience.title}
          shareText={`Book ${experience.title} on Guidemate`}
          variant="outline"
          className="rounded-lg px-4 py-2 text-xs"
        />
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex flex-col gap-10">
          {guide && (
            <ExperienceMetaList
              guideName={guide.full_name}
              guideRole={guideRole}
              guideAvatarUrl={guide.avatar_url}
              location={experience.location}
              durationHours={hours}
              languages={guide.languages}
              onHostClick={() => setAboutOpen(true)}
            />
          )}

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
            <p className="mt-2 font-semibold text-[var(--gm-ink)]">{experience.location ?? "Nairobi"}</p>
            <p className="text-sm text-brand-muted">Nairobi, Kenya</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-brand-border">
              <iframe
                title="Meeting location map"
                className="h-80 w-full border-0"
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=36.78%2C-1.34%2C37.00%2C-1.20&layer=mapnik&marker=-1.2864%2C36.8172"
              />
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-brand-accent hover:underline"
            >
              Open in Google Maps
            </a>
          </section>

          <ExperienceThingsToKnow
            durationMinutes={experience.duration_minutes}
            location={experience.location}
            languages={guide?.languages ?? []}
          />

          <div id="experience-times-mobile" className="lg:hidden">
            <h2 className="text-xl font-bold text-[var(--gm-ink)]">Available times</h2>
            <div className="mt-4">
              <ExperienceBookingPanel
                priceUsdc={experience.price_usdc}
                experienceId={experience.id}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                compact
              />
            </div>
          </div>

          {guide && (
            <div className="rounded-2xl border border-brand-border p-6 text-center">
              <Button variant="secondary" className="w-full max-w-md" onClick={() => setMessageOpen(true)}>
                Message {guide.full_name}
              </Button>
              <p className="mt-3 text-xs text-brand-muted">
                To help protect your payment, always use Guidemate to book and message hosts.
              </p>
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <ExperienceBookingPanel
            priceUsdc={experience.price_usdc}
            experienceId={experience.id}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        </aside>
      </div>

      {moreFromGuide.length > 0 && guide && (
        <div className="mt-14 border-t border-brand-border pt-10">
          <ExperienceRow
            title={`Past experiences with ${guide.full_name}`}
            experiences={moreFromGuide}
          />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-[var(--gm-surface)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div>
            <Price amountUsdc={experience.price_usdc} size="md" align="start" className="font-bold" />
            <p className="text-xs text-brand-muted">/ guest · free cancellation</p>
          </div>
          {selectedSlot ? (
            <Link href={`/book/${experience.id}?slot=${selectedSlot.id}`}>
              <Button variant="accent" className="rounded-xl px-6">Reserve</Button>
            </Link>
          ) : (
            <a href="#experience-times-mobile">
              <Button variant="accent" className="rounded-xl px-6">Show dates</Button>
            </a>
          )}
        </div>
      </div>

      {guide && (
        <>
          <GuideAboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} guide={guide} />
          <MessageGuideModal
            open={messageOpen}
            onClose={() => setMessageOpen(false)}
            guideName={guide.full_name}
            experienceTitle={experience.title}
            guideId={guide.id}
            signedIn={Boolean(session)}
          />
        </>
      )}
    </div>
  );
}
