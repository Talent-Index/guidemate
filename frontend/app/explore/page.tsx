"use client";

import { useEffect, useMemo, useState } from "react";
import { GreetingRow } from "@/components/ui/GreetingRow";
import { WelcomeTodayCard, type WelcomeAction } from "@/components/WelcomeTodayCard";
import { ExperienceMatchCard } from "@/components/ExperienceMatchCard";
import { ExperienceRow } from "@/components/experience/ExperienceRow";
import type { ExperienceCardData } from "@/components/experience/ExperienceCard";
import { ExperienceGridSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { EXPERIENCE_CATEGORIES } from "@/lib/categories";
import { listMyBookings } from "@/lib/api";

interface ExperienceListRow extends ExperienceCardData {
  description: string;
  tags: string[];
  duration_minutes: number;
  location: string | null;
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
          "id, title, description, tags, category, price_usdc, duration_minutes, location, image_url, guide:guide_id ( full_name, rating_avg, rating_count )"
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

  const categorySections = useMemo(() => {
    const grouped = new Map<string, ExperienceListRow[]>();
    for (const exp of experiences) {
      const key = exp.category ?? "More to explore";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(exp);
    }
    return Array.from(grouped.entries());
  }, [experiences]);

  const touristWelcomeActions: WelcomeAction[] = profile
    ? [
        {
          label: "Get a tailored match",
          description: "Describe what you want. AI finds the right guide.",
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
    <div className="flex flex-col gap-10">
      <div>
        {profile?.role === "tourist" ? (
          <GreetingRow subtitle="Browse what's live, or describe a trip and let the match agent pick a guide." />
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-[var(--gm-ink)] sm:text-3xl">Experiences in Nairobi</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Curated local tours. Book vetted guides with instant escrow protection.
            </p>
          </div>
        )}
      </div>

      {!authLoading && profile?.role === "tourist" && (
        <WelcomeTodayCard profile={profile} actions={touristWelcomeActions} />
      )}

      {!authLoading && <ExperienceMatchCard signedIn={Boolean(session)} initialQuery={initialQuery} />}

      <div id="browse-experiences" className="flex flex-col gap-12">
        {loadingExperiences && <ExperienceGridSkeleton />}

        {!loadingExperiences && activeCategory === ALL_CATEGORIES && experiences.length > 0 && (
          <ExperienceRow
            title="Popular experiences in Nairobi"
            experiences={experiences.slice(0, 12)}
            badgeForIndex={(i) => (i < 3 ? "Trending" : undefined)}
          />
        )}

        {!loadingExperiences &&
          activeCategory === ALL_CATEGORIES &&
          categorySections.map(([category, rows]) => (
            <ExperienceRow
              key={category}
              title={category}
              experiences={rows}
              seeAllHref={`/explore?category=${encodeURIComponent(category)}`}
            />
          ))}

        <section>
          <h2 className="text-xl font-bold text-[var(--gm-ink)]">Filter by category</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[ALL_CATEGORIES, ...EXPERIENCE_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeCategory === cat
                    ? "bg-brand-blue text-white"
                    : "border border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {activeCategory !== ALL_CATEGORIES && (
            <div className="mt-8">
              <ExperienceRow title={`${activeCategory} experiences`} experiences={visibleExperiences} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
