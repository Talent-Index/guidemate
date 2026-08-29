"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { ExperienceGridSkeleton } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { EXPERIENCE_CATEGORIES } from "@/lib/categories";
import { matchExperience, type Experience, type MatchResult } from "@/lib/api";
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

const EXAMPLE_REQUESTS = [
  "I want authentic street food in downtown Nairobi tonight.",
  "Something for art, museums and colonial history.",
  "A half-day safari at Nairobi National Park.",
];

export default function ExplorePage() {
  const { loading: authLoading, session } = useAuth();
  const [requestText, setRequestText] = useState("");
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [experiences, setExperiences] = useState<ExperienceListRow[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  useEffect(() => {
    // Lets the homepage's category cards deep-link straight into a filtered view, e.g. /explore?category=Food%20%26%20Drink.
    const fromUrl = new URLSearchParams(window.location.search).get("category");
    if (fromUrl && (EXPERIENCE_CATEGORIES as readonly string[]).includes(fromUrl)) {
      setActiveCategory(fromUrl);
    }
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) setRequestText(query);
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

  const visibleExperiences =
    activeCategory === ALL_CATEGORIES ? experiences : experiences.filter((exp) => exp.category === activeCategory);

  async function handleMatch() {
    setMatchError(null);
    setMatch(null);
    setMatching(true);
    try {
      const result = await matchExperience(requestText);
      setMatch(result);
    } catch (err) {
      setMatchError((err as Error).message);
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-brand-blueDark">Experiences you can book</h1>
        <p className="mt-1 text-sm text-brand-muted">Browse what&apos;s live right now. Sign in to get a match tailored by our AI agent.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {[ALL_CATEGORIES, ...EXPERIENCE_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === cat
                  ? "bg-brand-blue text-white"
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
                  <Link href={`/book/${exp.id}`}>
                    <Button variant="primary">Book</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {!authLoading && session ? (
        <Card>
          <h2 className="text-lg font-bold text-brand-blueDark">Get a tailored match</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Describe the experience you&apos;re after - our AI agent matches you with a vetted local guide.
          </p>

          <textarea
            className="form-input-light mt-4 resize-none"
            rows={3}
            placeholder="e.g. I want authentic street food in downtown Nairobi tonight."
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
          />

          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLE_REQUESTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setRequestText(example)}
                className="rounded-full border border-brand-border bg-brand-bg px-3 py-1 text-xs text-brand-muted hover:border-brand-accent hover:text-brand-accent"
              >
                {example}
              </button>
            ))}
          </div>

          <Button
            variant="accent"
            className="mt-4 w-full sm:w-auto"
            disabled={requestText.trim().length < 3 || matching}
            onClick={handleMatch}
          >
            {matching ? "Matching..." : "Find my guide"}
          </Button>

          {matchError && <p className="mt-2 text-sm text-red-600">{matchError}</p>}

          {match && (
            <div className="mt-4 rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">Best match</p>
              <ExperienceCard experience={match.experience} reason={match.reason} />
            </div>
          )}
        </Card>
      ) : (
        !authLoading && (
          <Card className="text-center sm:text-left">
            <h2 className="text-lg font-bold text-brand-blueDark">Want something more tailored?</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Sign in and tell our AI agent what you&apos;re after - we&apos;ll match you with a vetted guide, not just a list.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Link href="/auth/sign-in">
                <Button variant="primary">Sign in for AI matches</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button variant="secondary">Create an account</Button>
              </Link>
            </div>
          </Card>
        )
      )}
    </div>
  );
}

function ExperienceCard({ experience, reason }: { experience: Experience; reason: string }) {
  return (
    <div className="mt-2">
      <ExperiencePhoto
        src={experience.imageUrl}
        alt={experience.title}
        className="aspect-[16/9] w-full rounded-lg"
      />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-brand-blueDark">{experience.title}</h3>
          <p className="text-sm text-brand-muted">
            with {experience.guide.fullName}
            {experience.guide.isVetted && (
              <span className="ml-2 rounded-full bg-brand-successBg px-2 py-0.5 text-xs font-semibold text-brand-success">
                Vetted
              </span>
            )}
          </p>
          <StarRating value={experience.guide.ratingAvg} count={experience.guide.ratingCount} className="mt-1" />
        </div>
        <Price amountUsdc={experience.priceUsdc} />
      </div>
      <p className="mt-2 text-sm text-brand-muted">
        <span className="font-semibold text-brand-blueDark">Why this match: </span>
        {reason}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {experience.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-brand-accent">
            {tag}
          </span>
        ))}
      </div>
      <Link href={`/book/${experience.id}`}>
        <Button variant="primary" className="mt-4">
          Book this experience
        </Button>
      </Link>
    </div>
  );
}
