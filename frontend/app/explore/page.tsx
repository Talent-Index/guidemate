"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { ExperienceGridSkeleton } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/ui/StarRating";
import { ViewGuideProfileButton } from "@/components/ViewGuideProfileButton";
import { WelcomeTodayCard, type WelcomeAction } from "@/components/WelcomeTodayCard";
import { ExperienceMatchCard } from "@/components/ExperienceMatchCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { EXPERIENCE_CATEGORIES } from "@/lib/categories";
import { listMyBookings } from "@/lib/api";
import { Price } from "@/lib/fx";

interface ExperienceListRow {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  price_usdc: number;
  duration_minutes: number;
  location: string | null;
  image_url: string | null;
  guide: { id: string; full_name: string; rating_avg: number; rating_count: number; is_vetted: boolean } | null;
}

const ALL_CATEGORIES = "All";

export default function ExplorePage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [initialQuery, setInitialQuery] = useState("");
  const [bookingCount, setBookingCount] = useState(0);

  const [experiences, setExperiences] = useState<ExperienceListRow[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("category");
    if (fromUrl && (EXPERIENCE_CATEGORIES as readonly string[]).includes(fromUrl)) {
      setActiveCategory(fromUrl);
    }
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) setInitialQuery(query);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("experiences")
        .select(
          "id, title, description, tags, category, price_usdc, duration_minutes, location, image_url, guide:guide_id ( id, full_name, rating_avg, rating_count, is_vetted )"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setExperiences((data as unknown as ExperienceListRow[]) ?? []);
      setLoadingExperiences(false);
    })();
  }, []);

  useEffect(() => {
    if (!session || profile?.role !== "tourist") {
      setBookingCount(0);
      return;
    }
    listMyBookings(session.access_token)
      .then(({ bookings }) => setBookingCount(bookings.length))
      .catch(() => setBookingCount(0));
  }, [session, profile?.role]);

  const visibleExperiences =
    activeCategory === ALL_CATEGORIES ? experiences : experiences.filter((exp) => exp.category === activeCategory);

  const touristWelcomeActions: WelcomeAction[] = profile
    ? [
        {
          label: "Get a tailored match",
          description: "Describe what you want — AI finds the right guide.",
          href: "#experience-match",
          scrollToId: "experience-match",
        },
        {
          label: "Browse experiences",
          description: "See what's live and book directly.",
          href: "#browse-experiences",
          scrollToId: "browse-experiences",
        },
        {
          label: "Watch live guides",
          description: "Join a stream happening right now.",
          href: "/live",
        },
        bookingCount > 0
          ? {
              label: "View my trips",
              description: "Check bookings and message your guide.",
              href: "/tourist/bookings",
            }
          : {
              label: "Book your first tour",
              description: "Pick an experience and reserve a spot.",
              href: "#browse-experiences",
              scrollToId: "browse-experiences",
            },
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <MobilePageBanner eyebrow="Explore" title="Experiences you can book" />
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-brand-blueDark">Experiences you can book</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Browse what&apos;s live right now. Sign in to get a match tailored by our AI agent.
          </p>
        </div>
        <p className="mt-3 text-sm text-brand-muted md:hidden">
          Browse what&apos;s live right now. Sign in to get a match tailored by our AI agent.
        </p>
      </div>

      {!authLoading && profile?.role === "tourist" && (
        <WelcomeTodayCard profile={profile} actions={touristWelcomeActions} />
      )}

      {!authLoading && <ExperienceMatchCard signedIn={Boolean(session)} initialQuery={initialQuery} />}

      <div id="browse-experiences">
        <h2 className="text-lg font-bold text-brand-blueDark">Browse all experiences</h2>
        <p className="mt-1 text-sm text-brand-muted">Filter by category or book straight from the list.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {[ALL_CATEGORIES, ...EXPERIENCE_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition max-md:px-4 max-md:py-2 ${
                activeCategory === cat
                  ? "bg-brand-blue text-white max-md:bg-brand-amber max-md:text-brand-blueDark"
                  : "border border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loadingExperiences && <ExperienceGridSkeleton />}
        {!loadingExperiences && visibleExperiences.length === 0 && (
          <p className="mt-4 text-sm text-brand-muted">No experiences in this category yet.</p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {visibleExperiences.map((exp) => (
            <Card key={exp.id} className="overflow-hidden p-0">
              <ExperiencePhoto
                src={exp.image_url}
                alt={exp.title}
                className="aspect-[16/10] w-full"
                sizes="(min-width: 640px) 50vw, 100vw"
              />
              <div className="p-6">
                {exp.category && (
                  <span className="mb-1.5 inline-block rounded-full bg-brand-amber/20 px-2.5 py-0.5 text-xs font-semibold text-brand-blueDark">
                    {exp.category}
                  </span>
                )}
                <p className="font-semibold text-brand-blueDark">{exp.title}</p>
                <p className="text-sm text-brand-muted">
                  with {exp.guide?.full_name ?? "a Guidemate guide"}
                  {exp.guide?.is_vetted && (
                    <span className="ml-2 rounded-full bg-brand-successBg px-2 py-0.5 text-xs font-semibold text-brand-success">
                      Vetted
                    </span>
                  )}
                </p>
                <StarRating value={exp.guide?.rating_avg ?? 0} count={exp.guide?.rating_count ?? 0} className="mt-1" />
                <p className="mt-2 text-sm text-brand-muted line-clamp-2">{exp.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {exp.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full bg-brand-accent/10 px-2.5 py-0.5 text-xs text-brand-accent">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <Price amountUsdc={exp.price_usdc} />
                  <div className="flex flex-wrap gap-2">
                    {exp.guide?.id && <ViewGuideProfileButton guideId={exp.guide.id} />}
                    <Link href={`/book/${exp.id}`}>
                      <Button variant="primary">Book</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
