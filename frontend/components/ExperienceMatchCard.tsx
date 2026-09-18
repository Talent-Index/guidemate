"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { StarRating } from "@/components/ui/StarRating";
import { ViewGuideProfileButton } from "@/components/ViewGuideProfileButton";
import { matchExperience, type Experience, type MatchResult } from "@/lib/api";
import { getExperienceSharePath } from "@/lib/share";
import { Price } from "@/lib/fx";

const EXAMPLE_REQUESTS = [
  "I want authentic street food in downtown Nairobi tonight.",
  "Something for art, museums and colonial history.",
  "A half-day safari at Nairobi National Park.",
];

export function ExperienceMatchCard({
  signedIn,
  initialQuery = "",
  prominent,
}: {
  signedIn: boolean;
  initialQuery?: string;
  prominent?: boolean;
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
        <h2 className="text-lg font-bold text-brand-blueDark">Describe your ideal experience</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Sign in with a short description of what you want. We match you to vetted guides — or suggest what&apos;s
          available today.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
          <Link href="/auth/sign-in">
            <Button variant="primary">Sign in to get matched</Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button variant="secondary">Create an account</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card
      id="experience-match"
      className={prominent ? "border-brand-accent/40 bg-gradient-to-br from-brand-accent/5 to-white" : undefined}
    >
      <h2 className="text-lg font-bold text-brand-blueDark">Describe your experience</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Tell us what you&apos;re looking for in a sentence or two. We&apos;ll match you with the best guide — or
        recommend similar experiences that are bookable now.
      </p>

      <textarea
        className="form-input-light mt-4 resize-none"
        rows={3}
        placeholder="e.g. A 4-hour food tour in Westlands this Saturday for two people."
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
        {matching ? "Finding matches..." : "Match me"}
      </Button>

      {matchError && <p className="mt-2 text-sm text-red-600">{matchError}</p>}

      {match && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {match.exactMatch ? "Best match" : "Closest match"}
            </p>
            {!match.exactMatch && (
              <p className="mt-1 text-xs text-brand-muted">
                That exact trip isn&apos;t listed yet — here&apos;s the nearest fit on Guidemate.
              </p>
            )}
            <MatchedExperience experience={match.experience} reason={match.reason} />
          </div>

          {match.alternatives.length > 0 && (
            <div>
              <p className="text-sm font-bold text-brand-blueDark">Other experiences you can book</p>
              <ul className="mt-2 flex flex-col gap-3">
                {match.alternatives.map((exp) => (
                  <AlternativeExperience key={exp.id} experience={exp} />
                ))}
              </ul>
            </div>
          )}
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
        <span className="font-semibold text-brand-blueDark">Why: </span>
        {reason}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {experience.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-brand-accent">
            {tag}
          </span>
        ))}
      </div>
      <Link href={getExperienceSharePath(experience.id, experience.slug)}>
        <Button variant="primary" className="mt-4">
          View &amp; book
        </Button>
      </Link>
      <ViewGuideProfileButton guideId={experience.guide.id} slug={experience.guide.slug} className="mt-3 inline-block" />
    </div>
  );
}

function AlternativeExperience({ experience }: { experience: Experience }) {
  return (
    <li className="flex gap-3 rounded-lg border border-brand-border bg-white p-3">
      <ExperiencePhoto src={experience.imageUrl} alt={experience.title} className="h-16 w-16 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-brand-blueDark">{experience.title}</p>
        <p className="text-xs text-brand-muted">{experience.guide.fullName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Price amountUsdc={experience.priceUsdc} size="sm" />
          <Link
            href={getExperienceSharePath(experience.id, experience.slug)}
            className="text-xs font-semibold text-brand-accent hover:underline"
          >
            View experience
          </Link>
        </div>
      </div>
    </li>
  );
}
