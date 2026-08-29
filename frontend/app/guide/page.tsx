"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { completeBookingWithPin, listMyBookings, reportNoShow, type BookingRecord } from "@/lib/api";
import { Price } from "@/lib/fx";

const NO_SHOW_GRACE_PERIOD_MS = 30 * 60 * 1000;

export default function GuideActiveTourPage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportingNoShow, setReportingNoShow] = useState(false);
  const [noShowError, setNoShowError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function refresh() {
      try {
        const { bookings } = await listMyBookings(session!.access_token);
        if (cancelled) return;
        const active = bookings.find((b) => b.status === "locked") ?? bookings[0] ?? null;
        setBooking(active);
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

  async function handleReportNoShow() {
    if (!booking || !session) return;
    const confirmed = window.confirm(
      "Mark this tourist as a no-show? 80% of the booking will be refunded and Guidemate will keep a 20% inconvenience fee. This can't be undone."
    );
    if (!confirmed) return;

    setReportingNoShow(true);
    setNoShowError(null);
    try {
      const { booking: updated } = await reportNoShow(booking.bookingId, session.access_token);
      setBooking(updated);
    } catch (err) {
      setNoShowError((err as Error).message);
    } finally {
      setReportingNoShow(false);
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

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-sm justify-center gap-2">
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

      <Card className="w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Active Tour</h1>
        <p className="mt-1 text-sm text-brand-muted">
          When you arrive, ask the tourist to tap <span className="font-semibold text-brand-blueDark">End trip</span>{" "}
          and enter their 6-digit PIN here.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!booking && !error && (
          <p className="mt-8 text-sm text-brand-muted">
            No active bookings yet. Waiting for a tourist to book one of your experiences...
          </p>
        )}

        {booking && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <Chip tone={booking.status} />
            <p className="font-semibold text-brand-blueDark">{booking.experienceTitle ?? booking.guideName}</p>
            <p className="text-sm text-brand-muted">{booking.request}</p>
            <Price amountUsdc={booking.amountUsdc} />

            {booking.status === "locked" && session && (
              <EndTripPinForm
                bookingId={booking.bookingId}
                accessToken={session.access_token}
                onReleased={setBooking}
              />
            )}

            {booking.status !== "locked" && booking.status !== "refunded" && (
              <div className="rounded-lg bg-brand-successBg px-4 py-3 text-sm text-brand-success">
                Tour verified - payout in progress or complete.
              </div>
            )}

            {booking.status === "locked" && (
              <div className="mt-2 w-full border-t border-brand-border pt-4">
                {Date.now() - new Date(booking.createdAt).getTime() >= NO_SHOW_GRACE_PERIOD_MS ? (
                  <>
                    <button
                      type="button"
                      onClick={handleReportNoShow}
                      disabled={reportingNoShow}
                      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {reportingNoShow ? "Reporting..." : "Tourist didn't show up"}
                    </button>
                    {noShowError && <p className="mt-1 text-xs text-red-600">{noShowError}</p>}
                  </>
                ) : (
                  <p className="text-xs text-brand-muted">
                    &quot;Tourist didn&apos;t show up&quot; unlocks 30 minutes after booking.
                  </p>
                )}
              </div>
            )}

            {booking.status === "refunded" && booking.refund && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                Reported as a no-show. {booking.refund.refundAmount.toFixed(2)} USDC refunded,{" "}
                {booking.refund.feeAmount.toFixed(2)} USDC kept as an inconvenience fee.
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
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
  const [error, setError] = useState<string | null>(null);

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

  return (
    <form onSubmit={handleSubmit} className="w-full text-left">
      <label htmlFor="end-trip-pin" className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
        Tourist&apos;s 6-digit PIN
      </label>
      <input
        id="end-trip-pin"
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
        {submitting ? "Releasing escrow..." : "Confirm trip & release payment"}
      </Button>
      <p className="mt-2 text-center text-xs text-brand-muted">
        You can also scan the tourist&apos;s End trip QR at{" "}
        <Link href="/verify" className="font-semibold text-brand-accent">
          /verify
        </Link>
        .
      </p>
    </form>
  );
}
