"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  createBooking,
  getBooking,
  matchExperience,
  SNOWTRACE_TX_BASE,
  type BookingRecord,
  type MatchResult,
} from "@/lib/api";

const EXAMPLE_REQUESTS = [
  "My guest wants authentic downtown street food this evening.",
  "The guest is into art, museums and colonial history.",
  "They want a half-day safari at Nairobi National Park.",
];

// Demo-only hotel identity for this secondary B2B flow, so the escrow split
// still shows a distinct hotel share (10%) alongside the guide (85%) and
// protocol (5%). Direct tourist bookings via /explore skip this entirely.
const DEMO_HOTEL_NAME = "Villa Rosa Kempinski (demo)";
const DEMO_HOTEL_WALLET = "0x0900000000000000000000000000000000000009";

export default function ConciergePage() {
  const [requestText, setRequestText] = useState("");
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [booking2Error, setBookingError] = useState<string | null>(null);
  const [booking2Loading, setBookingLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleMatch() {
    setMatchError(null);
    setMatch(null);
    setBooking(null);
    setMatching(true);
    try {
      const result = await matchExperience(requestText);
      setMatch(result);
    } catch (err) {
      setMatchError((err as Error).message);
    } finally {
      setMatching(false);
    }
  }

  async function handleBook() {
    if (!match) return;
    setBookingError(null);
    setBookingLoading(true);
    try {
      const { booking: created } = await createBooking({
        request: requestText,
        experienceId: match.experience.id,
        matchReason: match.reason,
        hotelName: DEMO_HOTEL_NAME,
        hotelWallet: DEMO_HOTEL_WALLET,
      });
      setBooking(created);
      startPolling(created.bookingId);
    } catch (err) {
      setBookingError((err as Error).message);
    } finally {
      setBookingLoading(false);
    }
  }

  function startPolling(bookingId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { booking: latest } = await getBooking(bookingId);
        setBooking(latest);
        if (latest.status === "paid" && pollRef.current) {
          clearInterval(pollRef.current);
        }
      } catch {
        // booking not found yet / transient error - keep polling
      }
    }, 2500);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Card>
          <h1 className="text-xl font-bold text-brand-blueDark">Hotel Concierge Dashboard</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Describe what your guest wants. Our AI agent matches them with a vetted local guide experience.
          </p>

          <textarea
            className="mt-4 w-full rounded-lg border border-brand-border p-3 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
            rows={4}
            placeholder="e.g. My guest wants authentic downtown street food this evening."
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
          />

          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLE_REQUESTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setRequestText(example)}
                className="rounded-full border border-brand-border bg-brand-bg px-3 py-1 text-xs text-brand-muted hover:border-brand-accent hover:text-brand-accent"
              >
                {example}
              </button>
            ))}
          </div>

          <Button
            variant="accent"
            className="mt-4 w-full"
            disabled={requestText.trim().length < 3 || matching}
            onClick={handleMatch}
          >
            {matching ? "Matching..." : "Find a Guide"}
          </Button>

          {matchError && <p className="mt-2 text-sm text-red-600">{matchError}</p>}
        </Card>

        {match && (
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-blueDark">{match.experience.title}</h2>
                <p className="text-sm text-brand-muted">with {match.experience.guide.fullName}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {match.experience.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-accent/10 px-3 py-1 text-xs text-brand-accent">
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-3 rounded-lg bg-brand-bg p-3 text-sm text-brand-muted">
              <span className="font-semibold text-brand-blueDark">Why this match: </span>
              {match.reason}
            </p>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-brand-muted">Price</p>
                <p className="text-lg font-bold text-brand-blueDark">{match.experience.priceUsdc} USDC</p>
              </div>
              <Button variant="primary" disabled={booking2Loading} onClick={handleBook}>
                {booking2Loading ? "Locking escrow..." : "Book & Lock Escrow"}
              </Button>
            </div>
            {booking2Error && <p className="mt-2 text-sm text-red-600">{booking2Error}</p>}
          </Card>
        )}
      </div>

      <div>
        {booking ? (
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-brand-blueDark">Booking Status</h2>
              <Chip
                tone={booking.status === "paid" ? "paid" : booking.status === "released" ? "released" : "locked"}
              />
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Guide" value={booking.guideName} />
              <Row label="Amount" value={`${booking.amountUsdc} USDC`} />
              {booking.lockTxHash && (
                <Row
                  label="Escrow lock tx"
                  value={
                    <a
                      href={`${SNOWTRACE_TX_BASE}/${booking.lockTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-accent underline"
                    >
                      {shorten(booking.lockTxHash)}
                    </a>
                  }
                />
              )}
              {booking.releaseTxHash && (
                <Row
                  label="Release tx"
                  value={
                    <a
                      href={`${SNOWTRACE_TX_BASE}/${booking.releaseTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-accent underline"
                    >
                      {shorten(booking.releaseTxHash)}
                    </a>
                  }
                />
              )}
            </dl>

            {booking.splits && (
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <SplitBox label="Guide (85%)" value={booking.splits.guideAmount} />
                <SplitBox label="Hotel (10%)" value={booking.splits.hotelAmount} />
                <SplitBox label="Protocol (5%)" value={booking.splits.protocolAmount} />
              </div>
            )}

            {booking.payout && (
              <div className="mt-4 rounded-lg bg-brand-successBg p-4 text-brand-success">
                <p className="font-semibold">Payout sent</p>
                <p className="text-sm">
                  KES {booking.payout.kesAmount.toLocaleString()} sent to {booking.payout.phone} · Ref{" "}
                  {booking.payout.reference}
                </p>
              </div>
            )}

            {booking.status === "locked" && (
              <p className="mt-4 text-sm text-brand-muted">
                Waiting for the guide to complete the tour and the QR code to be scanned...
              </p>
            )}
          </Card>
        ) : (
          <Card className="flex h-full min-h-[200px] items-center justify-center text-center text-sm text-brand-muted">
            Match and book a guide to see live escrow &amp; payout status here.
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-brand-border pb-2">
      <dt className="text-brand-muted">{label}</dt>
      <dd className="font-medium text-brand-blueDark">{value}</dd>
    </div>
  );
}

function SplitBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-brand-bg p-3">
      <p className="text-xs text-brand-muted">{label}</p>
      <p className="font-semibold text-brand-blueDark">{value.toFixed(2)}</p>
    </div>
  );
}

function shorten(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}
