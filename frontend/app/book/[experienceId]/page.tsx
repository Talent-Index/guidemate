"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { StarRating } from "@/components/ui/StarRating";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { BookingConfirmation } from "@/components/BookingConfirmation";
import { ExperienceSlotPicker } from "@/components/experience/ExperienceSlotPicker";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  createBooking,
  initiateMpesaPayment,
  pollMpesaPayment,
  friendlyPaymentError,
  type BookingRecord,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Price } from "@/lib/fx";
import {
  type ExperienceSlot,
  formatSlotDate,
  formatSlotTimeRange,
} from "@/lib/slots";

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
  const searchParams = useSearchParams();
  const slotParam = searchParams.get("slot");

  const { loading: authLoading, session, profile } = useAuth();
  const { toast } = useToast();

  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [loadingExperience, setLoadingExperience] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<ExperienceSlot | null>(null);
  const [guests, setGuests] = useState(1);

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

  useEffect(() => {
    if (!slotParam) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("experience_slots")
        .select("id, experience_id, guide_id, starts_at, ends_at, max_guests, booked_guests, is_cancelled")
        .eq("id", slotParam)
        .maybeSingle();
      if (data) setSelectedSlot(data as ExperienceSlot);
    })();
  }, [slotParam]);

  async function handleConfirm() {
    if (!experience || !session || !selectedSlot) return;
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
            amountUsdc: experience.price_usdc * guests,
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
          request: `Booking: ${experience.title} on ${formatSlotDate(selectedSlot.starts_at)}`,
          experienceId: experience.id,
          matchReason: "Selected from experience page.",
          paymentMethod,
          paymentIntentId,
          slotId: selectedSlot.id,
          guests,
        },
        session.access_token
      );
      setBooking(created);
      toast(
        paymentMethod === "mpesa" ? "M-Pesa payment received. Booking confirmed." : "Booking confirmed",
        "success"
      );
    } catch (err) {
      const message = friendlyPaymentError((err as Error).message);
      setBookingError(message);
      toast(message, "error");
    } finally {
      setBookingLoading(false);
    }
  }

  if (authLoading || loadingExperience || (session && !profile)) {
    return <p className="text-sm text-brand-muted">Loading...</p>;
  }

  if (loadError || !experience) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-red-600">{loadError ?? "Experience not found."}</p>
        <Link href="/explore">
          <Button variant="secondary" className="mt-4">Back to Explore</Button>
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
          <Button variant="primary" className="mt-4">Sign in</Button>
        </Link>
      </Card>
    );
  }

  if (booking) {
    return <BookingConfirmation booking={booking} experience={experience} paymentMethod={paymentMethod} />;
  }

  const totalUsdc = experience.price_usdc * guests;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/experiences/${experience.id}`}
        className="mb-6 inline-block text-sm font-semibold text-brand-accent hover:underline"
      >
        Back to experience
      </Link>

      <h1 className="text-2xl font-bold text-brand-blueDark">Confirm and pay</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <section className="rounded-2xl border border-brand-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">Step 1</p>
                <h2 className="mt-1 text-lg font-bold text-brand-blueDark">Choose your time</h2>
              </div>
              {selectedSlot && (
                <span className="rounded-full bg-brand-successBg px-3 py-1 text-xs font-semibold text-brand-success">
                  Selected
                </span>
              )}
            </div>
            <div className="mt-4">
              <ExperienceSlotPicker
                experienceId={experience.id}
                selectedSlotId={selectedSlot?.id}
                onSelect={setSelectedSlot}
              />
            </div>
          </section>

          <section className={`rounded-2xl border border-brand-border p-6 ${!selectedSlot ? "opacity-50" : ""}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">Step 2</p>
            <h2 className="mt-1 text-lg font-bold text-brand-blueDark">Payment method</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(
                [
                  { id: "mpesa", label: "M-Pesa", desc: "Pay in KES. No crypto needed." },
                  { id: "demo", label: "Demo", desc: "Instant test booking" },
                  { id: "external", label: "Crypto wallet", desc: "MetaMask / WalletConnect" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!selectedSlot}
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

            {paymentMethod === "mpesa" && (
              <div className="mt-4">
                <label className="text-sm font-medium text-brand-blueDark">M-Pesa phone number</label>
                <input
                  className="form-input-light mt-1 w-full"
                  placeholder="+2547..."
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  disabled={!selectedSlot}
                />
              </div>
            )}

            {paymentMethod === "external" && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-bg p-4">
                <div>
                  <p className="text-sm font-semibold text-brand-blueDark">Connect wallet</p>
                  <p className="text-xs text-brand-muted">Optional. Demo mode still locks escrow for you.</p>
                </div>
                <WalletConnectButton />
              </div>
            )}
          </section>

          <section className={`rounded-2xl border border-brand-border p-6 ${!selectedSlot ? "opacity-50" : ""}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">Step 3</p>
            <h2 className="mt-1 text-lg font-bold text-brand-blueDark">Review and confirm</h2>
            <p className="mt-2 text-sm text-brand-muted">
              Your payment is held in escrow until the trip is complete. Free cancellation within 24 hours of the start time.
            </p>
            {bookingError && <p className="mt-3 text-sm text-red-600">{bookingError}</p>}
            <Button
              variant="accent"
              className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold sm:w-auto sm:px-10"
              disabled={bookingLoading || !selectedSlot}
              onClick={handleConfirm}
            >
              {bookingLoading ? "Processing..." : `Confirm and pay`}
            </Button>
          </section>
        </div>

        <aside>
          <Card className="sticky top-28 overflow-hidden p-0">
            <div className="flex gap-3 border-b border-brand-border p-4">
              <ExperiencePhoto src={experience.image_url} alt={experience.title} className="h-20 w-24 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold text-brand-blueDark">{experience.title}</p>
                {experience.guide && (
                  <StarRating
                    value={experience.guide.rating_avg}
                    count={experience.guide.rating_count}
                    className="mt-1"
                  />
                )}
              </div>
            </div>

            <div className="space-y-4 p-4 text-sm">
              {selectedSlot ? (
                <>
                  <div className="flex justify-between gap-4 border-b border-brand-border pb-4">
                    <div>
                      <p className="font-semibold text-brand-blueDark">Date</p>
                      <p className="text-brand-muted">{formatSlotDate(selectedSlot.starts_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-brand-blueDark">Time</p>
                      <p className="text-brand-muted">
                        {formatSlotTimeRange(selectedSlot.starts_at, selectedSlot.ends_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-brand-border pb-4">
                    <div>
                      <p className="font-semibold text-brand-blueDark">Guests</p>
                      <p className="text-brand-muted">{guests} guest{guests !== 1 ? "s" : ""}</p>
                    </div>
                    <select
                      className="rounded-lg border border-brand-border bg-white px-2 py-1 text-sm"
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      aria-label="Number of guests"
                    >
                      {Array.from({ length: Math.min(10, selectedSlot.max_guests - selectedSlot.booked_guests) }, (_, i) => i + 1).map(
                        (n) => (
                          <option key={n} value={n}>{n}</option>
                        )
                      )}
                    </select>
                  </div>
                </>
              ) : (
                <p className="text-brand-muted">Select a time to see your booking summary.</p>
              )}

              <div>
                <p className="font-semibold text-brand-blueDark">Price details</p>
                <div className="mt-2 flex justify-between text-brand-muted">
                  <span>
                    <Price amountUsdc={experience.price_usdc} size="sm" align="start" className="inline-flex" />
                    <span> x {guests} guest{guests !== 1 ? "s" : ""}</span>
                  </span>
                  <Price amountUsdc={totalUsdc} size="sm" align="start" className="inline-flex font-semibold text-brand-blueDark" />
                </div>
                <div className="mt-3 flex justify-between border-t border-brand-border pt-3 font-bold text-brand-blueDark">
                  <span>Total</span>
                  <Price amountUsdc={totalUsdc} size="md" align="start" className="inline-flex" />
                </div>
              </div>

              <p className="text-xs text-brand-accent">Free cancellation within 24 hours</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
