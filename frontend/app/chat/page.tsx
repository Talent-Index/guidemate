"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listMyBookings, type BookingRecord } from "@/lib/api";

function chatPartnerName(booking: BookingRecord, userId: string): string {
  return booking.guideId === userId ? booking.touristName ?? "Tourist" : booking.guideName;
}

export default function ChatInboxPage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function refresh() {
      try {
        const { bookings: latest } = await listMyBookings(session!.access_token);
        if (!cancelled) {
          setBookings(latest.filter((b) => b.status === "locked"));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refresh();
    const interval = setInterval(refresh, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session]);

  if (authLoading) return null;

  if (!session) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Sign in to view messages</h1>
        <Link href="/auth/sign-in">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <MobilePageBanner eyebrow="Messages" title="Trip chats" />
      <div className="hidden md:block">
        <h1 className="text-xl font-bold text-brand-blueDark">Messages</h1>
        <p className="text-sm text-brand-muted">
          Chat with {profile?.role === "guide" ? "tourists" : "guides"} during active trips.
        </p>
      </div>

      {loading && <ListRowSkeleton count={2} />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && bookings.length === 0 && (
        <Card className="text-center text-sm text-brand-muted">
          No active trip chats.{" "}
          {profile?.role === "guide" ? (
            <>
              Open{" "}
              <Link href="/guide" className="font-semibold text-brand-accent">
                Tour
              </Link>{" "}
              when you have a booking.
            </>
          ) : (
            <>
              Book an experience from{" "}
              <Link href="/explore" className="font-semibold text-brand-accent">
                Explore
              </Link>
              .
            </>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {bookings.map((booking) => (
          <Link key={booking.bookingId} href={`/chat/${booking.bookingId}`}>
            <Card className="transition hover:border-brand-accent/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-blueDark">
                    {chatPartnerName(booking, session.user.id)}
                  </p>
                  <p className="text-sm text-brand-muted">{booking.experienceTitle ?? "Experience"}</p>
                  {booking.experienceLocation && (
                    <p className="mt-0.5 text-xs text-brand-muted">{booking.experienceLocation}</p>
                  )}
                </div>
                <span className="text-xs font-semibold text-brand-accent">Open →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
