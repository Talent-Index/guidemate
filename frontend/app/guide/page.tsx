"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { completeBooking, completeBookingWithPin, listMyBookings, reportNoShow, submitTouristRating, type BookingRecord } from "@/lib/api";
import { Price } from "@/lib/fx";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { QrScanner, type QrScannerHandle } from "@/components/QrScanner";
import { RatePanel } from "@/components/RatePanel";
import { StarRating } from "@/components/ui/StarRating";
import { ViewTouristProfileButton } from "@/components/ViewTouristProfileButton";

const NO_SHOW_GRACE_PERIOD_MS = 30 * 60 * 1000;

export default function GuideActiveTourPage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [noShowError, setNoShowError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function refresh() {
      try {
        const { bookings: latest } = await listMyBookings(session!.access_token);
        if (cancelled) return;
        setBookings(latest.filter((b) => b.guideId === session!.user.id));
        setError(null);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    refresh();
    const interval = setInterval(refresh, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session]);

  async function handleReportNoShow(booking: BookingRecord) {
    if (!session) return;
    const confirmed = window.confirm(
      "Mark this tourist as a no-show? 80% of the booking will be refunded and Guidemate will keep a 20% inconvenience fee. This can't be undone."
    );
    if (!confirmed) return;

    setReportingId(booking.bookingId);
    setNoShowError(null);
    try {
      const { booking: updated } = await reportNoShow(booking.bookingId, session.access_token);
      setBookings((prev) => prev.map((b) => (b.bookingId === updated.bookingId ? updated : b)));
    } catch (err) {
      setNoShowError((err as Error).message);
    } finally {
      setReportingId(null);
    }
  }

  if (authLoading) return null;

  if (!session || profile?.role !== "guide") {
    return (
      <div className="mx-auto max-w-md text-center">
        <Card>
          <h1 className="text-xl font-bold text-brand-blueDark">Guide sign-in required</h1>
          <p className="mt-2 text-sm text-brand-muted">Sign in with a guide account to see your active tours.</p>
          <Link href="/auth/sign-in">
            <Button variant="primary" className="mt-4">
              Sign in
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const locked = bookings.filter((b) => b.status === "locked");
  const awaitingTouristRating = bookings.filter(
    (b) => b.status === "paid" && Boolean(b.touristId) && !b.touristRating
  );

  return (
    <div className="flex flex-col items-center gap-6">
      <MobilePageBanner eyebrow="Tour" title="Your active tour" />
      <div className="hidden w-full max-w-sm justify-center gap-2 md:flex">
        <Link href="/guide" className="rounded-full bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white">
          Active tour
        </Link>
        <Link
          href="/guide/dashboard"
          className="rounded-full border border-brand-border px-4 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-accent hover:text-brand-accent"
        >
          Dashboard
        </Link>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <p className="text-center text-sm text-brand-muted">
          When the tourist taps <span className="font-semibold text-brand-blueDark">End trip</span>, type their 6-digit
          PIN here or scan their QR.
        </p>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        {locked.length === 0 && awaitingTouristRating.length === 0 && !error && (
          <Card className="text-center">
            <p className="text-sm text-brand-muted">
              No locked bookings on your listings yet. A tourist must book one of{" "}
              <span className="font-semibold text-brand-blueDark">your</span> experiences. Then this page shows their
              name, phone, and the PIN / scan box.
            </p>
            <Link href="/guide/dashboard">
              <Button variant="secondary" className="mt-4">
                Open dashboard
              </Button>
            </Link>
          </Card>
        )}

        {locked.map((booking) => (
          <Card key={booking.bookingId}>
            <div className="flex flex-col items-center gap-4 text-center">
              <Chip tone={booking.status} />
              <TouristDetails booking={booking} />
              <p className="font-semibold text-brand-blueDark">{booking.experienceTitle ?? "Experience"}</p>
              {booking.request && <p className="text-sm text-brand-muted">{booking.request}</p>}
              <Price amountUsdc={booking.amountUsdc} />

              <EndTripPinForm
                bookingId={booking.bookingId}
                accessToken={session.access_token}
                onReleased={(updated) =>
                  setBookings((prev) => prev.map((b) => (b.bookingId === updated.bookingId ? updated : b)))
                }
              />

              <Link
                href={`/chat/${booking.bookingId}`}
                className="inline-flex w-full items-center justify-center rounded-full border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-blueDark transition hover:border-brand-accent/40"
              >
                Message {booking.touristName ?? "tourist"}
              </Link>

              <div className="w-full border-t border-brand-border pt-4">
                {Date.now() - new Date(booking.createdAt).getTime() >= NO_SHOW_GRACE_PERIOD_MS ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleReportNoShow(booking)}
                      disabled={reportingId === booking.bookingId}
                      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {reportingId === booking.bookingId ? "Reporting..." : "Tourist didn't show up"}
                    </button>
                    {noShowError && <p className="mt-1 text-xs text-red-600">{noShowError}</p>}
                  </>
                ) : (
                  <p className="text-xs text-brand-muted">
                    &quot;Tourist didn&apos;t show up&quot; unlocks 30 minutes after booking.
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}

        {awaitingTouristRating.map((booking) => (
          <Card key={`rate-${booking.bookingId}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-success">Trip completed</p>
            <p className="mt-1 font-semibold text-brand-blueDark">{booking.experienceTitle ?? "Experience"}</p>
            <TouristDetails booking={booking} />
            <RatePanel
              title={`Rate ${booking.touristName?.trim() || "this tourist"}`}
              subtitle="How was this guest? Your rating helps other guides."
              existing={booking.touristRating}
              placeholder="Optional: note how the trip went (visible to the tourist)"
              onSubmit={async (stars, comment) => {
                const { rating } = await submitTouristRating(
                  { bookingId: booking.bookingId, stars, comment },
                  session.access_token
                );
                setBookings((prev) =>
                  prev.map((b) => (b.bookingId === booking.bookingId ? { ...b, touristRating: rating } : b))
                );
                return rating;
              }}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}

function TouristDetails({ booking }: { booking: BookingRecord }) {
  const name = booking.touristName?.trim() || "Guest";
  const languages = booking.touristLanguages ?? [];
  const tripCount = booking.touristCompletedTripCount ?? 0;
  return (
    <div className="w-full rounded-2xl border border-brand-border bg-brand-bg px-4 py-3 text-left">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Tourist</p>
      <p className="mt-1 text-lg font-bold text-brand-blueDark">{name}</p>
      {booking.touristRatingCount > 0 ? (
        <StarRating value={booking.touristRatingAvg} count={booking.touristRatingCount} className="mt-1" />
      ) : (
        <p className="mt-1 text-xs text-brand-muted">No tourist ratings yet</p>
      )}
      <p className="mt-1 text-xs text-brand-muted">
        {tripCount} {tripCount === 1 ? "trip" : "trips"} completed
      </p>
      {booking.touristPhone ? (
        <a href={`tel:${booking.touristPhone}`} className="mt-1 inline-block text-sm font-semibold text-brand-accent">
          {booking.touristPhone}
        </a>
      ) : (
        <p className="mt-1 text-sm text-brand-muted">No phone on file</p>
      )}
      {languages.length > 0 && (
        <p className="mt-2 text-sm text-brand-muted">
          <span className="font-semibold text-brand-blueDark">Languages: </span>
          {languages.join(", ")}
        </p>
      )}
      {booking.touristBio && <p className="mt-2 text-sm text-brand-muted">{booking.touristBio}</p>}
      {booking.touristId && (
        <ViewTouristProfileButton touristId={booking.touristId} className="mt-3 block" fullWidth />
      )}
    </div>
  );
}

function extractToken(scanned: string): string {
  try {
    const url = new URL(scanned);
    const token = url.searchParams.get("token");
    if (token) return token;
  } catch {
    // not a URL
  }
  return scanned;
}

function EndTripPinForm({
  bookingId,
  accessToken,
  onReleased,
}: {
  bookingId: string;
  accessToken: string;
  onReleased: (booking: BookingRecord) => void;
}) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<QrScannerHandle>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin.length !== 6) return;
    setSubmitting(true);
    setError(null);
    try {
      const { booking } = await completeBookingWithPin(bookingId, pin, accessToken);
      onReleased(booking);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScan(raw: string) {
    setSubmitting(true);
    setError(null);
    try {
      const { booking } = await completeBooking(extractToken(raw));
      await scannerRef.current?.stop();
      setScanning(false);
      onReleased(booking);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Release payment</p>
      <p className="mt-1 text-sm text-brand-muted">Scan the tourist&apos;s End trip QR, or type the 6-digit PIN they show you.</p>

      <Button
        type="button"
        variant="accent"
        className="mt-4 w-full"
        disabled={submitting}
        onClick={() => {
          setError(null);
          if (scanning) {
            void scannerRef.current?.stop();
            setScanning(false);
            return;
          }
          setScanning(true);
          void scannerRef.current?.start();
        }}
      >
        {scanning ? "Hide camera" : "Scan tourist QR"}
      </Button>

      <div className={scanning ? "mt-3 overflow-hidden rounded-2xl border border-brand-border p-2" : "hidden"}>
        {submitting ? (
          <p className="py-6 text-center text-sm text-brand-muted">Verifying and releasing escrow...</p>
        ) : (
          <QrScanner
            ref={scannerRef}
            autoStart={false}
            elementId={`guide-scan-${bookingId}`}
            onScan={(text) => void handleScan(text)}
          />
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <label htmlFor={`end-trip-pin-${bookingId}`} className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Or enter PIN
        </label>
        <input
          id={`end-trip-pin-${bookingId}`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="\d{6}"
          className="form-input-light mt-1 text-center font-mono text-2xl tracking-[0.4em]"
          placeholder="000000"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button variant="primary" type="submit" className="mt-3 w-full" disabled={pin.length !== 6 || submitting}>
          {submitting ? "Releasing escrow..." : "Confirm PIN & release payment"}
        </Button>
      </form>
    </div>
  );
}
