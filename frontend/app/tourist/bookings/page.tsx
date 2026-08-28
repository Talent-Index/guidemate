"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listMyBookings, SNOWTRACE_TX_BASE, type BookingRecord } from "@/lib/api";

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
            <div className="flex items-center justify-between">
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
          </Card>
        ))}
      </div>
    </div>
  );
}
