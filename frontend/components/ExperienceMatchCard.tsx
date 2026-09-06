"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { StarRating } from "@/components/ui/StarRating";
import { ViewGuideProfileButton } from "@/components/ViewGuideProfileButton";
import { matchExperience, type Experience, type MatchResult } from "@/lib/api";
import { Price } from "@/lib/fx";

const EXAMPLE_REQUESTS = [
  "I want authentic street food in downtown Nairobi tonight.",
  "Something for art, museums and colonial history.",
  "A half-day safari at Nairobi National Park.",
];

export function ExperienceMatchCard({
  signedIn,
  initialQuery = "",
}: {
  signedIn: boolean;
  initialQuery?: string;
}) {
  const [requestText, setRequestText] = useState(initialQuery);
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) setRequestText(initialQuery);
  }, [initialQuery]);

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

  if (!signedIn) {
    return (
      <Card className="text-center sm:text-left">
        <h2 className="text-lg font-bold text-brand-blueDark">Want something more tailored?</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Sign in and tell our AI agent what you&apos;re after — we&apos;ll match you with a vetted guide, not just a list.
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
    );
  }

  return (
    <Card id="experience-match">
      <h2 className="text-lg font-bold text-brand-blueDark">Get a tailored match</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Describe the experience you&apos;re after — our AI agent matches you with a vetted local guide.
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
        onClick={() => void handleMatch()}
      >
        {matching ? "Matching..." : "Find my guide"}
      </Button>

      {matchError && <p className="mt-2 text-sm text-red-600">{matchError}</p>}

      {match && (
        <div className="mt-4 rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">Best match</p>
          <MatchedExperience experience={match.experience} reason={match.reason} />
        </div>
      )}
    </Card>
  );
}

function MatchedExperience({ experience, reason }: { experience: Experience; reason: string }) {
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
      <ViewGuideProfileButton guideId={experience.guide.id} className="mt-3 inline-block" />
    </div>
  );
}
