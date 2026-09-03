"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { StarRating } from "@/components/ui/StarRating";
import { getGuideProfile, type GuidePublicProfile } from "@/lib/api";
import { Price } from "@/lib/fx";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function GuideProfilePage() {
  const params = useParams<{ guideId: string }>();
  const [guide, setGuide] = useState<GuidePublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGuideProfile(params.guideId)
      .then(({ guide: profile }) => {
        if (!cancelled) setGuide(profile);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.guideId]);

  if (loading) return null;

  if (error || !guide) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-red-600">{error ?? "Guide not found."}</p>
        <Link href="/explore">
          <Button variant="secondary" className="mt-4">
            Back to Explore
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <MobilePageBanner eyebrow="Guide" title={guide.fullName} />
      <Card>
        <div className="hidden md:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Guide profile</p>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-amber text-lg font-bold text-brand-blueDark">
            {initials(guide.fullName) || "G"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-brand-blueDark">{guide.fullName}</h1>
              {guide.isVetted && (
                <span className="rounded-full bg-brand-successBg px-2 py-0.5 text-xs font-semibold text-brand-success">
                  Vetted
                </span>
              )}
            </div>
            <StarRating value={guide.ratingAvg} count={guide.ratingCount} className="mt-1" />
            {guide.bio && <p className="mt-3 text-sm text-brand-muted">{guide.bio}</p>}
            {guide.languages.length > 0 && (
              <p className="mt-2 text-sm text-brand-muted">
                <span className="font-semibold text-brand-blueDark">Languages: </span>
                {guide.languages.join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Trips completed" value={String(guide.completedTripCount)} />
          <Stat label="Reviews" value={String(guide.ratingCount)} />
          <Stat
            label="Average rating"
            value={guide.ratingCount ? guide.ratingAvg.toFixed(1) : "—"}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </Card>

      {guide.experiences.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Experiences</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {guide.experiences.map((exp) => (
              <Card key={exp.id} className="overflow-hidden p-0">
                <ExperiencePhoto
                  src={exp.imageUrl}
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
                  <p className="mt-2 text-sm text-brand-muted line-clamp-2">{exp.description}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <Price amountUsdc={exp.priceUsdc} />
                    <Link href={`/book/${exp.id}`}>
                      <Button variant="primary">Book</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Reviews</h2>
        {guide.reviews.length === 0 ? (
          <Card className="mt-3">
            <p className="text-sm text-brand-muted">No reviews yet. Book a trip to be the first.</p>
          </Card>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {guide.reviews.map((review, index) => (
              <Card key={`${review.createdAt}-${index}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-brand-blueDark">{review.touristFirstName}</p>
                  <p className="text-xs text-brand-muted">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
                <StarRating value={review.stars} count={1} showCount={false} className="mt-1" />
                {review.comment && <p className="mt-2 text-sm text-brand-muted">&quot;{review.comment}&quot;</p>}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-brand-border bg-brand-bg px-4 py-3 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-blueDark">{value}</p>
    </div>
  );
}
