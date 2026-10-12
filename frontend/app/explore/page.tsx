"use client";

import { useEffect, useMemo, useState } from "react";
import { WelcomeTodayCard, type WelcomeAction } from "@/components/WelcomeTodayCard";
import { ExperienceRow } from "@/components/experience/ExperienceRow";
import { ExperienceSearchBar } from "@/components/experience/ExperienceSearchBar";
import { ExperienceSearchEmpty } from "@/components/experience/ExperienceSearchEmpty";
import type { ExperienceCardData } from "@/components/experience/ExperienceCard";
import { ExperienceGridSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { EXPERIENCE_CATEGORIES } from "@/lib/categories";
import { listMyBookings } from "@/lib/api";
import { filterExperiencesByQuery, recommendExperiences } from "@/lib/experienceSearch";
import {
  ALL_KENYA_REGIONS,
  KENYA_EXPLORE_REGIONS,
  experienceMatchesKenyaRegion,
  getKenyaRegionById,
} from "@/lib/kenyaRegions";

interface ExperienceListRow extends ExperienceCardData {
  description: string;
  tags: string[];
  duration_minutes: number;
  location: string | null;
}

const ALL_CATEGORIES = "All";
const ALL_REGIONS = "all";

function filterChipClass(active: boolean) {
  return `rounded-full px-4 py-2 text-xs font-semibold transition ${
    active
      ? "bg-brand-blue text-white"
      : "border border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent"
  }`;
}

export default function ExplorePage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingCount, setBookingCount] = useState(0);
  const [experiences, setExperiences] = useState<ExperienceListRow[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [activeRegion, setActiveRegion] = useState<string>(ALL_REGIONS);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("category");
    if (fromUrl && (EXPERIENCE_CATEGORIES as readonly string[]).includes(fromUrl)) {
      setActiveCategory(fromUrl);
    }
    const region = params.get("region");
    if (region && (region === ALL_REGIONS || getKenyaRegionById(region))) {
      setActiveRegion(region);
    }
    const query = params.get("q");
    if (query) setSearchQuery(query);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ behavior: "smooth" });
  }, [authLoading, session]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("experiences")
        .select(
          "id, slug, title, description, tags, category, price_usdc, duration_minutes, location, image_url, guide:guide_id ( full_name, rating_avg, rating_count )"
        )
        .eq("status", "published")
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

  const regionMeta = getKenyaRegionById(activeRegion);
  const regionLabel = regionMeta?.label ?? ALL_KENYA_REGIONS;

  const regionFiltered = useMemo(
    () => experiences.filter((exp) => experienceMatchesKenyaRegion(exp, activeRegion)),
    [experiences, activeRegion]
  );

  const categoryFiltered = useMemo(
    () =>
      activeCategory === ALL_CATEGORIES
        ? regionFiltered
        : regionFiltered.filter((exp) => exp.category === activeCategory),
    [regionFiltered, activeCategory]
  );

  const trimmedSearch = searchQuery.trim();
  const isSearching = trimmedSearch.length > 0;
  const searchResults = useMemo(
    () => filterExperiencesByQuery(categoryFiltered, trimmedSearch),
    [categoryFiltered, trimmedSearch]
  );
  const recommendations = useMemo(
    () => recommendExperiences(regionFiltered.length > 0 ? regionFiltered : experiences, trimmedSearch, 6),
    [regionFiltered, experiences, trimmedSearch]
  );

  const categorySections = useMemo(() => {
    const grouped = new Map<string, ExperienceListRow[]>();
    for (const exp of regionFiltered) {
      const key = exp.category ?? "More to explore";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(exp);
    }
    return Array.from(grouped.entries());
  }, [regionFiltered]);

  const popularTitle =
    activeRegion === ALL_REGIONS
      ? "Popular experiences in Kenya"
      : `Popular in ${regionLabel}`;

  function scrollToBrowse() {
    document.getElementById("browse-experiences")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSearchSubmit() {
    if (trimmedSearch) scrollToBrowse();
  }

  function clearSearch() {
    setSearchQuery("");
    scrollToBrowse();
  }

  const touristWelcomeActions: WelcomeAction[] = profile
    ? [
        {
          label: "Browse experiences",
          description: "See what's live and book directly.",
          href: "#browse-experiences",
          scrollToId: "browse-experiences",
        },
        {
          label: "Search listings",
          description: "Find a tour by name or neighborhood.",
          href: "#experience-search",
          scrollToId: "experience-search",
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
    <div className="flex min-w-0 flex-col gap-8 sm:gap-10">
      <div>
        <h1 className="text-2xl font-bold text-[var(--gm-ink)] sm:text-3xl">
          {activeRegion === ALL_REGIONS ? "Experiences in Kenya" : `Experiences in ${regionLabel}`}
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          {profile?.role === "tourist"
            ? "Search or browse vetted tours below."
            : "Curated local tours with vetted guides."}
        </p>
      </div>

      <ExperienceSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSubmit={handleSearchSubmit}
      />

      <div id="browse-experiences" className="flex flex-col gap-12 scroll-mt-24">
        {loadingExperiences && <ExperienceGridSkeleton />}

        {!loadingExperiences && isSearching && searchResults.length > 0 && (
          <ExperienceRow title={`Results for “${trimmedSearch}”`} experiences={searchResults} />
        )}

        {!loadingExperiences && isSearching && searchResults.length === 0 && (
          <ExperienceSearchEmpty
            query={trimmedSearch}
            recommendations={recommendations}
            onClearSearch={clearSearch}
          />
        )}

        {!loadingExperiences && !isSearching && regionFiltered.length === 0 && (
          <ExperienceSearchEmpty
            query={activeRegion === ALL_REGIONS ? "this area" : regionLabel}
            recommendations={recommendExperiences(experiences, "", 6)}
            onClearSearch={() => setActiveRegion(ALL_REGIONS)}
            clearButtonLabel="Show all Kenya"
          />
        )}

        {!loadingExperiences && !isSearching && regionFiltered.length > 0 && (
          <>
            {activeCategory === ALL_CATEGORIES && (
              <ExperienceRow
                title={popularTitle}
                experiences={regionFiltered.slice(0, 12)}
                badgeForIndex={(i) => (i < 3 ? "Trending" : undefined)}
              />
            )}

            {activeCategory === ALL_CATEGORIES &&
              categorySections.map(([category, rows]) => (
                <ExperienceRow
                  key={category}
                  title={category}
                  experiences={rows}
                  seeAllHref={`/explore?category=${encodeURIComponent(category)}${
                    activeRegion !== ALL_REGIONS ? `&region=${encodeURIComponent(activeRegion)}` : ""
                  }`}
                />
              ))}

            <section>
              <h2 className="text-xl font-bold text-[var(--gm-ink)]">Filter by region</h2>
              <p className="mt-1 text-sm text-brand-muted">Counties and areas across Kenya.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveRegion(ALL_REGIONS)}
                  className={filterChipClass(activeRegion === ALL_REGIONS)}
                >
                  {ALL_KENYA_REGIONS}
                </button>
                {KENYA_EXPLORE_REGIONS.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setActiveRegion(region.id)}
                    className={filterChipClass(activeRegion === region.id)}
                  >
                    {region.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--gm-ink)]">Filter by category</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {[ALL_CATEGORIES, ...EXPERIENCE_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={filterChipClass(activeCategory === cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {activeCategory !== ALL_CATEGORIES && (
                <div className="mt-8">
                  <ExperienceRow
                    title={`${activeCategory} · ${regionLabel}`}
                    experiences={categoryFiltered}
                  />
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {!authLoading && profile?.role === "tourist" && (
        <WelcomeTodayCard profile={profile} actions={touristWelcomeActions} />
      )}
    </div>
  );
}
