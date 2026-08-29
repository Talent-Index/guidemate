"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { StarRating, StarRatingInput } from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getQrToken,
  getVerifyUrl,
  listMyBookings,
  submitRating,
  SNOWTRACE_TX_BASE,
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
          <Card key={booking.bookingId} className="overflow-hidden p-0">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:gap-5">
              <ExperiencePhoto
                src={booking.experienceImageUrl}
                alt={booking.experienceTitle ?? "Experience"}
                className="aspect-[16/10] w-full shrink-0 rounded-lg sm:aspect-square sm:w-32"
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
                  </div>
                  <Chip tone={booking.status} />
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

                {booking.status === "refunded" && booking.refund && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    <p className="font-semibold">Marked as a no-show and refunded.</p>
                    <p className="mt-1 text-xs">
                      {booking.refund.refundAmount.toFixed(2)} USDC refunded · {booking.refund.feeAmount.toFixed(2)}{" "}
                      USDC kept by Guidemate as an inconvenience fee.
                    </p>
                    {booking.refundTxHash && (
                      <a
                        href={`${SNOWTRACE_TX_BASE}/${booking.refundTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold underline"
                      >
                        View refund on Snowtrace
                      </a>
                    )}
                  </div>
                )}

                {booking.status === "locked" && <CompletionCodeSection bookingId={booking.bookingId} />}

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
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/// Once the guide completes the tour, either side can settle it: the guide shows
/// this same QR on their Active Tour screen, or the tourist can pull it up here
/// and either scan it themselves or hand the raw code to whoever's checking out.
function CompletionCodeSection({ bookingId }: { bookingId: string }) {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getQrToken(bookingId)
      .then(({ qrToken: token }) => {
        if (!cancelled) setQrToken(token);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  async function handleCopy() {
    if (!qrToken) return;
    await navigator.clipboard.writeText(qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-border p-3">
      <p className="text-sm font-semibold text-brand-blueDark">Completion code</p>
      <p className="text-xs text-brand-muted">
        Once your guide confirms the tour is done, scan this QR (or enter the code below) at{" "}
        <Link href="/verify" className="text-brand-accent underline">
          /verify
        </Link>{" "}
        to release payment.
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {qrToken && (
        <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="rounded-lg border border-brand-border bg-white p-2">
            <QRCodeSVG value={getVerifyUrl(qrToken)} size={120} />
          </div>
          <div className="flex w-full flex-col gap-2">
            <p className="text-xs font-medium text-brand-muted">Code</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-brand-bg px-3 py-2 text-xs text-brand-blueDark">
                {qrToken}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-lg border border-brand-border px-3 py-2 text-xs font-semibold text-brand-accent hover:border-brand-accent"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <Link href="/verify">
              <Button variant="secondary" className="w-full sm:w-auto">
                Open /verify
              </Button>
            </Link>
          </div>
        </div>
      )}
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
