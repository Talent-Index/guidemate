"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { StarRating } from "@/components/ui/StarRating";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { createBooking, SNOWTRACE_TX_BASE, type BookingRecord } from "@/lib/api";

interface ExperienceDetail {
  id: string;
  title: string;
  description: string;
  tags: string[];
  price_usdc: number;
  duration_minutes: number;
  location: string | null;
  image_url: string | null;
  guide: {
    id: string;
    full_name: string;
    bio: string | null;
    languages: string[];
    rating_avg: number;
    rating_count: number;
  } | null;
}

export default function BookExperiencePage() {
  const params = useParams<{ experienceId: string }>();
  const { loading: authLoading, session, profile } = useAuth();

  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [loadingExperience, setLoadingExperience] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("experiences")
        .select(
          "id, title, description, tags, price_usdc, duration_minutes, location, image_url, guide:guide_id ( id, full_name, bio, languages, rating_avg, rating_count )"
        )
        .eq("id", params.experienceId)
        .maybeSingle();
      if (error || !data) {
        setLoadError("Experience not found.");
      } else {
        setExperience(data as unknown as ExperienceDetail);
      }
      setLoadingExperience(false);
    })();
  }, [params.experienceId]);

  async function handleConfirm() {
    if (!experience) return;
    setBookingError(null);
    setBookingLoading(true);
    try {
      const { booking: created } = await createBooking(
        {
          request: `Direct booking: ${experience.title}`,
          experienceId: experience.id,
          matchReason: "Selected directly from Explore.",
        },
        session?.access_token
      );
      setBooking(created);
    } catch (err) {
      setBookingError((err as Error).message);
    } finally {
      setBookingLoading(false);
    }
  }

  if (authLoading || loadingExperience) return null;

  if (loadError || !experience) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-red-600">{loadError ?? "Experience not found."}</p>
        <Link href="/explore">
          <Button variant="secondary" className="mt-4">
            Back to Explore
          </Button>
        </Link>
      </Card>
    );
  }

  if (!session || profile?.role !== "tourist") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Sign in to book</h1>
        <p className="mt-2 text-sm text-brand-muted">
          Create a tourist account (or sign in) to book &quot;{experience.title}&quot;.
        </p>
        <Link href="/auth/sign-in">
          <Button variant="primary" className="mt-4">
            Sign in
          </Button>
        </Link>
      </Card>
    );
  }

  if (booking) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Booking confirmed</h1>
        <p className="mt-2 text-sm text-brand-muted">
          {experience.title} with {experience.guide?.full_name} is locked in escrow.
        </p>
        <p className="mt-4 text-lg font-bold text-brand-blueDark">{booking.amountUsdc} USDC</p>
        {booking.lockTxHash && (
          <a
            href={`${SNOWTRACE_TX_BASE}/${booking.lockTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-brand-accent underline"
          >
            View escrow lock transaction
          </a>
        )}
        <p className="mt-4 text-sm text-brand-muted">
          Your guide will show you a QR code once the tour is done - scan it at{" "}
          <Link href="/verify" className="text-brand-accent underline">
            /verify
          </Link>{" "}
          to release payment.
        </p>
        <Link href="/tourist/bookings">
          <Button variant="secondary" className="mt-4">
            View my bookings
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="overflow-hidden p-0">
        <ExperiencePhoto src={experience.image_url} alt={experience.title} className="aspect-[16/9] w-full" />
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-brand-blueDark">{experience.title}</h1>
              <p className="text-sm text-brand-muted">with {experience.guide?.full_name}</p>
              <StarRating
                value={experience.guide?.rating_avg ?? 0}
                count={experience.guide?.rating_count ?? 0}
                className="mt-1"
              />
            </div>
            <span className="text-xl font-bold text-brand-blueDark">{experience.price_usdc} USDC</span>
          </div>

          <p className="mt-3 text-sm text-brand-muted">{experience.description}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {experience.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-brand-accent/10 px-2.5 py-0.5 text-xs text-brand-accent">
                {tag}
              </span>
            ))}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-brand-muted">Duration</dt>
              <dd className="font-medium text-brand-blueDark">{experience.duration_minutes} minutes</dd>
            </div>
            {experience.location && (
              <div>
                <dt className="text-brand-muted">Location</dt>
                <dd className="font-medium text-brand-blueDark">{experience.location}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex items-center justify-between rounded-lg bg-brand-bg p-4">
            <div>
              <p className="text-sm font-semibold text-brand-blueDark">Your wallet</p>
              <p className="text-xs text-brand-muted">
                Optional - shown for your reference, doesn&apos;t block booking.
              </p>
            </div>
            <WalletConnectButton />
          </div>

          {bookingError && <p className="mt-3 text-sm text-red-600">{bookingError}</p>}

          <Button variant="primary" className="mt-6 w-full" disabled={bookingLoading} onClick={handleConfirm}>
            {bookingLoading ? "Locking escrow..." : `Confirm & pay ${experience.price_usdc} USDC`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
