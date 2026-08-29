"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { StarRating } from "@/components/ui/StarRating";
import { createClient } from "@/lib/supabase/client";
import { matchExperience, type Experience, type MatchResult } from "@/lib/api";

interface ExperienceListRow {
  id: string;
  title: string;
  description: string;
  tags: string[];
  price_usdc: number;
  duration_minutes: number;
  location: string | null;
  image_url: string | null;
  guide: { id: string; full_name: string; rating_avg: number; rating_count: number } | null;
}

const EXAMPLE_REQUESTS = [
  "I want authentic street food in downtown Nairobi tonight.",
  "Something for art, museums and colonial history.",
  "A half-day safari at Nairobi National Park.",
];

export default function ExplorePage() {
  const [requestText, setRequestText] = useState("");
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [experiences, setExperiences] = useState<ExperienceListRow[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("experiences")
        .select(
          "id, title, description, tags, price_usdc, duration_minutes, location, image_url, guide:guide_id ( id, full_name, rating_avg, rating_count )"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setExperiences((data as unknown as ExperienceListRow[]) ?? []);
      setLoadingExperiences(false);
    })();
  }, []);

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
      <Card>
        <h1 className="text-xl font-bold text-brand-blueDark">Tell us what you want to do</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Describe the experience you&apos;re after - our AI agent matches you with a vetted local guide.
        </p>

        <textarea
          className="mt-4 w-full rounded-lg border border-brand-border p-3 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
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

      <div>
        <h2 className="text-lg font-bold text-brand-blueDark">All experiences</h2>
        {loadingExperiences && <p className="mt-2 text-sm text-brand-muted">Loading...</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {experiences.map((exp) => (
            <Card key={exp.id} className="overflow-hidden p-0">
              <ExperiencePhoto
                src={exp.image_url}
                alt={exp.title}
                className="aspect-[16/10] w-full"
                sizes="(min-width: 640px) 50vw, 100vw"
              />
              <div className="p-6">
                <p className="font-semibold text-brand-blueDark">{exp.title}</p>
                <p className="text-sm text-brand-muted">with {exp.guide?.full_name ?? "a Guidemate guide"}</p>
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
                  <span className="whitespace-nowrap text-lg font-bold text-brand-blueDark">{exp.price_usdc} USDC</span>
                  <Link href={`/book/${exp.id}`}>
                    <Button variant="primary">Book</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
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
          <p className="text-sm text-brand-muted">with {experience.guide.fullName}</p>
          <StarRating value={experience.guide.ratingAvg} count={experience.guide.ratingCount} className="mt-1" />
        </div>
        <span className="whitespace-nowrap text-lg font-bold text-brand-blueDark">{experience.priceUsdc} USDC</span>
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
