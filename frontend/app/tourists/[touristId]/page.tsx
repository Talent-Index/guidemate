"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { StarRating } from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getTouristProfile, type TouristPublicProfile } from "@/lib/api";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TouristProfilePage() {
  const params = useParams<{ touristId: string }>();
  const { loading: authLoading, session, profile } = useAuth();
  const [tourist, setTourist] = useState<TouristPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setLoading(false);
      setError("Sign in as a guide to view this tourist.");
      return;
    }
    let cancelled = false;
    getTouristProfile(params.touristId, session.access_token)
      .then(({ tourist: next }) => {
        if (!cancelled) setTourist(next);
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
  }, [authLoading, session, params.touristId]);

  if (authLoading || loading) return null;

  if (error || !tourist) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-red-600">{error ?? "Tourist not found."}</p>
        <Link href={profile?.role === "guide" ? "/guide" : "/tourist/bookings"}>
          <Button variant="secondary" className="mt-4">
            Back
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <MobilePageBanner eyebrow="Tourist" title={tourist.fullName} />
      <Card>
        <div className="hidden md:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Tourist profile</p>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-amber text-lg font-bold text-brand-blueDark">
            {initials(tourist.fullName) || "T"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-brand-blueDark">{tourist.fullName}</h1>
            <StarRating value={tourist.ratingAvg} count={tourist.ratingCount} className="mt-1" />
            {tourist.phone ? (
              <a href={`tel:${tourist.phone}`} className="mt-2 inline-block text-sm font-semibold text-brand-accent">
                {tourist.phone}
              </a>
            ) : (
              <p className="mt-2 text-sm text-brand-muted">No phone on file</p>
            )}
            {tourist.bio && <p className="mt-3 text-sm text-brand-muted">{tourist.bio}</p>}
            {tourist.languages.length > 0 && (
              <p className="mt-2 text-sm text-brand-muted">
                <span className="font-semibold text-brand-blueDark">Languages: </span>
                {tourist.languages.join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Trips completed" value={String(tourist.completedTripCount)} />
          <Stat label="Reviews" value={String(tourist.ratingCount)} />
          <Stat
            label="Average rating"
            value={tourist.ratingCount ? tourist.ratingAvg.toFixed(1) : "—"}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </Card>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">What guides said</h2>
        {tourist.reviews.length === 0 ? (
          <Card className="mt-3">
            <p className="text-sm text-brand-muted">No guide reviews yet for this guest.</p>
          </Card>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {tourist.reviews.map((review, index) => (
              <Card key={`${review.createdAt}-${index}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-blueDark">{review.guideFirstName}</p>
                    {review.experienceTitle && (
                      <p className="text-xs text-brand-muted">{review.experienceTitle}</p>
                    )}
                  </div>
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
