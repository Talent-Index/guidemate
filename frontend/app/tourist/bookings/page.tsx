"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { StarRating, StarRatingInput } from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listMyBookings, submitRating, SNOWTRACE_TX_BASE, type BookingRecord } from "@/lib/api";

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
        <h1 className="text-xl font-bold text-brand-blueDark">My bookings</h1>
        <p className="text-sm text-brand-muted">
          Signed in as {profile?.fullName ?? session.user.email} · escrow status updates live.
        </p>
      </div>

      {loadingBookings && <p className="text-sm text-brand-muted">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loadingBookings && bookings.length === 0 && (
        <Card className="text-center text-sm text-brand-muted">
          No bookings yet.{" "}
          <Link href="/explore" className="font-semibold text-brand-accent">
            Find an experience
          </Link>
          .
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {bookings.map((booking) => (
          <Card key={booking.bookingId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-brand-blueDark">{booking.experienceTitle ?? "Experience"}</p>
                <p className="text-sm text-brand-muted">with {booking.guideName}</p>
              </div>
              <Chip tone={booking.status === "paid" ? "paid" : booking.status === "released" ? "released" : "locked"} />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-brand-muted">Amount</span>
              <span className="font-semibold text-brand-blueDark">{booking.amountUsdc} USDC</span>
            </div>

            {booking.lockTxHash && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-brand-muted">Escrow lock tx</span>
                <a
                  href={`${SNOWTRACE_TX_BASE}/${booking.lockTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-accent underline"
                >
                  View on Snowtrace
                </a>
              </div>
            )}

            {booking.payout && (
              <div className="mt-3 rounded-lg bg-brand-successBg p-3 text-sm text-brand-success">
                Payout of KES {booking.payout.kesAmount.toLocaleString()} sent to the guide.
              </div>
            )}

            {booking.status === "locked" && (
              <p className="mt-3 text-sm text-brand-muted">
                Waiting for your guide to complete the tour, then scan their QR at{" "}
                <Link href="/verify" className="text-brand-accent underline">
                  /verify
                </Link>{" "}
                to release payment.
              </p>
            )}

            {booking.status === "paid" && (
              <RateTourSection
                booking={booking}
                accessToken={session.access_token}
                onRated={(rating) =>
                  setBookings((prev) =>
                    prev.map((b) => (b.bookingId === booking.bookingId ? { ...b, rating } : b))
                  )
                }
              />
            )}
          </Card>
        ))}
      </div>
    </div>
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
        className="mt-2 w-full rounded-lg border border-brand-border p-2 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
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
