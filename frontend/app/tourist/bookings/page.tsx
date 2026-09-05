"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ExperiencePhotoStrip, experiencePhotoUrls } from "@/components/ui/ExperiencePhotoStrip";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/ui/StarRating";
import { EndTripPanel } from "@/components/EndTripPanel";
import { RatePanel } from "@/components/RatePanel";
import { ViewGuideProfileButton } from "@/components/ViewGuideProfileButton";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  listMyBookings,
  submitRating,
  type BookingRecord,
} from "@/lib/api";

export default function TouristBookingsPage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function refresh() {
      try {
        const { bookings: latest } = await listMyBookings(session!.access_token);
        if (!cancelled) {
          setBookings((prev) => {
            const unchanged =
              prev.length === latest.length &&
              prev.every(
                (b, i) =>
                  b.bookingId === latest[i]?.bookingId &&
                  b.status === latest[i]?.status &&
                  b.rating?.stars === latest[i]?.rating?.stars
              );
            return unchanged ? prev : latest;
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoadingBookings(false);
      }
    }

    refresh();
    const interval = setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session]);

  if (authLoading) return null;

  const upcoming = bookings.filter((b) => b.status === "locked");
  const past = bookings.filter((b) => b.status !== "locked");

  if (!session) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Sign in to see your bookings</h1>
        <Link href="/auth/sign-in">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <MobilePageBanner eyebrow="Bookings" title="Your trips" />
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-brand-blueDark">My trips</h1>
          <p className="text-sm text-brand-muted">
            Signed in as {profile?.fullName ?? session.user.email}
          </p>
        </div>
        <p className="mt-3 text-sm text-brand-muted md:hidden">
          Signed in as {profile?.fullName ?? session.user.email}
        </p>
      </div>

      {loadingBookings && <ListRowSkeleton count={3} />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loadingBookings && bookings.length === 0 && (
        <Card className="text-center text-sm text-brand-muted">
          No trips yet.{" "}
          <Link href="/explore" className="font-semibold text-brand-accent">
            Find an experience
          </Link>
          .
        </Card>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Upcoming</h2>
          <div className="mt-3 flex flex-col gap-4">
            {upcoming.map((booking) => (
              <TripCard
                key={booking.bookingId}
                booking={booking}
                sessionToken={session.access_token}
                onRated={(rating) =>
                  setBookings((prev) =>
                    prev.map((b) => (b.bookingId === booking.bookingId ? { ...b, rating } : b))
                  )
                }
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Past activities</h2>
          <div className="mt-3 flex flex-col gap-4">
            {past.map((booking) => (
              <TripCard
                key={booking.bookingId}
                booking={booking}
                sessionToken={session.access_token}
                onRated={(rating) =>
                  setBookings((prev) =>
                    prev.map((b) => (b.bookingId === booking.bookingId ? { ...b, rating } : b))
                  )
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TripCard({
  booking,
  sessionToken,
  onRated,
}: {
  booking: BookingRecord;
  sessionToken: string;
  onRated: (rating: NonNullable<BookingRecord["rating"]>) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:gap-5">
        <ExperiencePhotoStrip
          urls={experiencePhotoUrls(booking)}
          alt={booking.experienceTitle ?? "Experience"}
          className="max-w-[9rem] shrink-0 sm:max-w-none"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-blueDark">{booking.experienceTitle ?? "Experience"}</p>
              <p className="text-sm text-brand-muted">with {booking.guideName}</p>
              <ViewGuideProfileButton guideId={booking.guideId} className="mt-2 inline-block" />
              {(booking.experienceLocation || booking.experienceDurationMinutes) && (
                <p className="mt-0.5 text-xs text-brand-muted">
                  {booking.experienceLocation}
                  {booking.experienceLocation && booking.experienceDurationMinutes ? " · " : ""}
                  {booking.experienceDurationMinutes ? `${booking.experienceDurationMinutes} min` : ""}
                </p>
              )}
              <p className="mt-1 text-xs text-brand-muted">{new Date(booking.createdAt).toLocaleDateString()}</p>
            </div>
            <Chip tone={booking.status} />
          </div>
          <p className="mt-3 text-lg font-bold text-brand-blueDark">{booking.amountUsdc} USDC</p>
          {booking.status === "paid" && <p className="mt-2 text-sm text-brand-success">Trip completed</p>}
          {booking.status === "refunded" && (
            <p className="mt-2 text-sm text-red-700">Cancelled or marked as a no-show</p>
          )}
          {booking.status === "locked" && (
            <>
              <EndTripPanel bookingId={booking.bookingId} accessToken={sessionToken} />
              <Link
                href={`/chat/${booking.bookingId}`}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-blueDark transition hover:border-brand-accent/40"
              >
                Message {booking.guideName}
              </Link>
            </>
          )}
          {booking.status === "paid" && (
            <>
              <RatePanel
                title={`Rate ${booking.guideName}`}
                subtitle="How was your experience? Your rating helps other tourists choose."
                existing={booking.rating}
                placeholder="Optional: say a bit about your guide (public)"
                onSubmit={async (stars, comment) => {
                  const { rating } = await submitRating(
                    { bookingId: booking.bookingId, stars, comment },
                    sessionToken
                  );
                  onRated(rating);
                  return rating;
                }}
              />
              {booking.touristRating && (
                <div className="mt-3 rounded-lg bg-brand-bg p-3">
                  <p className="text-xs font-semibold text-brand-muted">Your guide rated you</p>
                  <StarRating value={booking.touristRating.stars} count={1} showCount={false} className="mt-1" />
                  {booking.touristRating.comment && (
                    <p className="mt-1 text-sm text-brand-muted">&quot;{booking.touristRating.comment}&quot;</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
