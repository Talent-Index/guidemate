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
import { Price } from "@/lib/fx";

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
        <div className="mt-4 flex justify-center">
          <Price amountUsdc={booking.amountUsdc} align="start" />
        </div>
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
          Payment is held in the Guidemate escrow contract. When you arrive, open{" "}
          <Link href="/tourist/bookings" className="text-brand-accent underline">
            My bookings
          </Link>{" "}
          and tap End trip - your guide enters the 6-digit PIN (or scans the QR) to get paid.
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
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-brand-blueDark">{experience.title}</h1>
              <p className="text-sm text-brand-muted">with {experience.guide?.full_name}</p>
              <StarRating
                value={experience.guide?.rating_avg ?? 0}
                count={experience.guide?.rating_count ?? 0}
                className="mt-1"
              />
            </div>
            <Price amountUsdc={experience.price_usdc} size="lg" />
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-bg p-4">
            <div>
              <p className="text-sm font-semibold text-brand-blueDark">Your wallet</p>
              <p className="text-xs text-brand-muted">
                Optional - shown for your reference, doesn&apos;t block booking.
              </p>
            </div>
            <WalletConnectButton />
          </div>

          <FeeBreakdown priceUsdc={experience.price_usdc} />

          {bookingError && <p className="mt-3 text-sm text-red-600">{bookingError}</p>}

          <Button variant="primary" className="mt-6 w-full" disabled={bookingLoading} onClick={handleConfirm}>
            {bookingLoading ? "Locking escrow..." : `Confirm & pay ${experience.price_usdc} USDC`}
          </Button>
        </div>
      </Card>
    </div>
  );
}

const GUIDE_BPS = 8500;
const BPS_DENOMINATOR = 10_000;

/// Direct tourist bookings have no booking partner in the loop, so the escrow's
/// 10% "hotel" slot routes to the Guidemate treasury alongside the 5% protocol
/// slice - see GuidemateEscrow.sol's resolvedHotelWallet fallback. That's a
/// 15% platform take here vs. the 5% Guidemate keeps when a booking partner
/// (e.g. hotel concierge) is in the loop and earns the other 10% as a referral fee.
function FeeBreakdown({ priceUsdc }: { priceUsdc: number }) {
  const guideAmount = (priceUsdc * GUIDE_BPS) / BPS_DENOMINATOR;
  const platformAmount = priceUsdc - guideAmount;

  return (
    <div className="mt-4 rounded-lg border border-brand-border p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Where your money goes</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-brand-muted">Guide receives (85%)</span>
        <Price amountUsdc={guideAmount} size="sm" />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-brand-muted">Guidemate platform fee (15%)</span>
        <Price amountUsdc={platformAmount} size="sm" />
      </div>
      <p className="mt-2 text-xs text-brand-muted">
        Guidemate&apos;s core platform fee is a flat 5%. The other 10% here goes to Guidemate too since
        there&apos;s no booking partner involved - when a partner (e.g. a hotel concierge desk) refers the
        booking instead, that 10% goes to them as a referral fee.
      </p>
    </div>
  );
}
