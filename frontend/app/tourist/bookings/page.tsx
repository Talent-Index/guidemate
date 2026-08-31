"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { StarRating, StarRatingInput } from "@/components/ui/StarRating";
import { EndTripPanel } from "@/components/EndTripPanel";
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
          setBookings(latest);
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
        <ExperiencePhoto
          src={booking.experienceImageUrl}
          alt={booking.experienceTitle ?? "Experience"}
          className="aspect-[16/10] w-full shrink-0 rounded-lg max-md:rounded-2xl sm:aspect-square sm:w-32"
          sizes="128px"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-blueDark">{booking.experienceTitle ?? "Experience"}</p>
              <p className="text-sm text-brand-muted">with {booking.guideName}</p>
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
            <EndTripPanel bookingId={booking.bookingId} accessToken={sessionToken} />
          )}
          {booking.status === "paid" && (
            <RateTourSection booking={booking} accessToken={sessionToken} onRated={onRated} />
          )}
        </div>
      </div>
    </Card>
  );
}

function RateTourSection({
  booking,
  accessToken,
  onRated,
}: {
  booking: BookingRecord;
  accessToken: string;
  onRated: (rating: NonNullable<BookingRecord["rating"]>) => void;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (booking.rating) {
    return (
      <div className="mt-3 rounded-lg bg-brand-bg p-3">
        <p className="text-xs font-semibold text-brand-muted">Your rating</p>
        <StarRating value={booking.rating.stars} count={1} className="mt-1" />
        {booking.rating.comment && <p className="mt-1 text-sm text-brand-muted">&quot;{booking.rating.comment}&quot;</p>}
      </div>
    );
  }

  async function handleSubmit() {
    if (stars < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const { rating } = await submitRating({ bookingId: booking.bookingId, stars, comment: comment.trim() }, accessToken);
      onRated(rating);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-border p-3">
      <p className="text-sm font-semibold text-brand-blueDark">Rate {booking.guideName}</p>
      <p className="text-xs text-brand-muted">How was your experience? Your rating helps other tourists choose.</p>
      <StarRatingInput value={stars} onChange={setStars} className="mt-2" />
      <textarea
        className="form-input-light mt-2 resize-none"
        rows={2}
        placeholder="Optional: say a bit about your guide (public)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <Button variant="primary" className="mt-2" disabled={stars < 1 || submitting} onClick={handleSubmit}>
        {submitting ? "Submitting..." : "Submit rating"}
      </Button>
    </div>
  );
}
