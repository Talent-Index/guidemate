"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getQrToken, getVerifyUrl, listMyBookings, reportNoShow, type BookingRecord } from "@/lib/api";

// Mirrors backend/src/routes/bookings.ts's NO_SHOW_GRACE_PERIOD_MS - only used
// here to decide when to show the button; the backend re-checks and is the
// source of truth.
const NO_SHOW_GRACE_PERIOD_MS = 30 * 60 * 1000;

export default function GuideActiveTourPage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
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
        // Show the most recent booking that still needs the guide's completion QR,
        // otherwise fall back to the latest booking so the demo shows the paid state.
        const active = bookings.find((b) => b.status === "locked") ?? bookings[0] ?? null;
        setBooking(active);

        if (active && active.status === "locked") {
          const { qrToken: token } = await getQrToken(active.bookingId);
          if (!cancelled) setQrToken(token);
        } else {
          setQrToken(null);
        }
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
      setQrToken(null);
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
        <p className="mt-1 text-sm text-brand-muted">Show this screen to the tourist once the excursion is complete.</p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!booking && !error && (
          <p className="mt-8 text-sm text-brand-muted">No active bookings yet. Waiting for a tourist to book one of your experiences...</p>
        )}

        {booking && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <Chip tone={booking.status} />
            <p className="font-semibold text-brand-blueDark">{booking.experienceTitle ?? booking.guideName}</p>
            <p className="text-sm text-brand-muted">{booking.request}</p>
            <p className="text-lg font-bold text-brand-blueDark">{booking.amountUsdc} USDC</p>

            {qrToken ? (
              <div className="rounded-card border border-brand-border p-4">
                <QRCodeSVG value={getVerifyUrl(qrToken)} size={220} />
              </div>
            ) : (
              <div className="rounded-lg bg-brand-successBg px-4 py-3 text-sm text-brand-success">
                Tour verified - payout in progress or complete.
              </div>
            )}

            {qrToken && (
              <p className="text-xs text-brand-muted">
                Tourist scans this with their phone camera, or verifies it on{" "}
                <span className="font-medium text-brand-accent">/verify</span>.
              </p>
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
