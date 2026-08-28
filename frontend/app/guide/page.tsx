"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getQrToken, getVerifyUrl, listMyBookings, type BookingRecord } from "@/lib/api";

export default function GuideActiveTourPage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            <Chip tone={booking.status === "paid" ? "paid" : booking.status === "released" ? "released" : "locked"} />
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
          </div>
        )}
      </Card>
    </div>
  );
}
