"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { StarRating } from "@/components/ui/StarRating";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { BookingConfirmation } from "@/components/BookingConfirmation";
import { ViewGuideProfileButton } from "@/components/ViewGuideProfileButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { createBooking, initiateMpesaPayment, pollMpesaPayment, type BookingRecord } from "@/lib/api";
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

type PaymentMethod = "demo" | "mpesa" | "custodial" | "external";

export default function BookExperiencePage() {
  const params = useParams<{ experienceId: string }>();
  const { loading: authLoading, session, profile } = useAuth();

  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [loadingExperience, setLoadingExperience] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("demo");
  const [mpesaPhone, setMpesaPhone] = useState("");

  useEffect(() => {
    if (profile?.phone) setMpesaPhone(profile.phone);
  }, [profile?.phone]);

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
    if (!experience || !session) return;
    setBookingError(null);
    setBookingLoading(true);
    try {
      let paymentIntentId: string | undefined;
      if (paymentMethod === "mpesa") {
        if (!mpesaPhone.trim()) throw new Error("Enter your M-Pesa phone number");
        const payment = await initiateMpesaPayment(
          {
            purpose: "booking",
            referenceId: experience.id,
            amountUsdc: experience.price_usdc,
            phone: mpesaPhone.trim(),
          },
          session.access_token
        );
        if (payment.status === "processing") {
          await pollMpesaPayment(payment.intentId, session.access_token);
        }
        paymentIntentId = payment.intentId;
      }

      const { booking: created } = await createBooking(
        {
          request: `Direct booking: ${experience.title}`,
          experienceId: experience.id,
          matchReason: "Selected directly from Explore.",
          paymentMethod,
          paymentIntentId,
        },
        session.access_token
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
      <BookingConfirmation booking={booking} experience={experience} paymentMethod={paymentMethod} />
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
              {experience.guide?.id && (
                <ViewGuideProfileButton guideId={experience.guide.id} className="mt-3 inline-block" />
              )}
            </div>
            <Price amountUsdc={experience.price_usdc} />
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

          <div className="mt-6">
            <p className="text-sm font-semibold text-brand-blueDark">How would you like to pay?</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(
                [
                  { id: "mpesa", label: "M-Pesa", desc: "Pay in KES — no crypto needed" },
                  { id: "demo", label: "Demo", desc: "Instant test booking" },
                  { id: "external", label: "Crypto wallet", desc: "MetaMask / WalletConnect" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`rounded-xl border p-3 text-left text-sm transition ${
                    paymentMethod === opt.id
                      ? "border-brand-accent bg-brand-accent/10"
                      : "border-brand-border hover:border-brand-accent/50"
                  }`}
                >
                  <p className="font-semibold text-brand-blueDark">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-brand-muted">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "mpesa" && (
            <div className="mt-4">
              <label className="text-sm font-medium text-brand-blueDark">M-Pesa phone number</label>
              <input
                className="form-input-light mt-1 w-full"
                placeholder="+2547..."
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
              />
            </div>
          )}

          {paymentMethod === "external" && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-bg p-4">
              <div>
                <p className="text-sm font-semibold text-brand-blueDark">Connect wallet</p>
                <p className="text-xs text-brand-muted">Optional — demo mode still locks escrow for you.</p>
              </div>
              <WalletConnectButton />
            </div>
          )}

          {bookingError && <p className="mt-3 text-sm text-red-600">{bookingError}</p>}

          <Button variant="primary" className="mt-6 w-full" disabled={bookingLoading} onClick={handleConfirm}>
            {bookingLoading ? "Processing…" : `Book for ${experience.price_usdc} USDC`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
