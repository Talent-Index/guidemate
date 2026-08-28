"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { getQrToken, getVerifyUrl, listBookings, type BookingRecord } from "@/lib/api";

export default function GuideViewPage() {
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const { bookings } = await listBookings();
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
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Guide View</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Show this screen to the tourist once the excursion is complete.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!booking && !error && (
          <p className="mt-8 text-sm text-brand-muted">No active bookings yet. Waiting for a concierge to book a tour...</p>
        )}

        {booking && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <Chip tone={booking.status === "paid" ? "paid" : booking.status === "released" ? "released" : "locked"} />
            <p className="font-semibold text-brand-blueDark">{booking.guide.name}</p>
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
                Tourist scans this with their phone camera, or the concierge scans it on{" "}
                <span className="font-medium text-brand-accent">/verify</span>.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
