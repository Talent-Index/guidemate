"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChatPanel } from "@/components/ChatPanel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listMyBookings, type BookingRecord } from "@/lib/api";

function chatPartnerName(booking: BookingRecord, userId: string): string {
  return booking.guideId === userId ? booking.touristName ?? "Tourist" : booking.guideName;
}

export default function ChatThreadPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const { loading: authLoading, session, profile } = useAuth();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !bookingId) return;
    let cancelled = false;

    async function load() {
      try {
        const { bookings } = await listMyBookings(session!.access_token);
        const match = bookings.find((b) => b.bookingId === bookingId);
        if (!cancelled) {
          if (!match || match.status !== "locked") {
            setBooking(null);
            setError(match ? "This trip chat has ended." : "Booking not found.");
          } else {
            setBooking(match);
            setError(null);
          }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
  }, [session, bookingId]);

  if (authLoading) return null;

  if (!session) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Sign in to chat</h1>
        <Link href="/auth/sign-in">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </Card>
    );
  }

  const backHref = profile?.role === "guide" ? "/chat" : "/chat";

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col md:min-h-[calc(100dvh-8rem)]">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={backHref}
          className="text-sm font-semibold text-brand-accent hover:underline"
        >
          ← Messages
        </Link>
      </div>

      {loading && <p className="text-sm text-brand-muted">Loading…</p>}
      {error && (
        <Card className="text-center text-sm text-brand-muted">
          <p>{error}</p>
          <Link href="/chat" className="mt-3 inline-block font-semibold text-brand-accent">
            Back to messages
          </Link>
        </Card>
      )}

      {booking && (
        <>
          <div className="mb-4">
            <h1 className="text-lg font-bold text-brand-blueDark">
              {chatPartnerName(booking, session.user.id)}
            </h1>
            <p className="text-sm text-brand-muted">{booking.experienceTitle ?? "Experience"}</p>
          </div>
          <ChatPanel
            bookingId={booking.bookingId}
            accessToken={session.access_token}
            currentUserId={session.user.id}
            variant="page"
          />
        </>
      )}
    </div>
  );
}
