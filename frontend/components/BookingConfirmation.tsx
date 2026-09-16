"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { StarRating } from "@/components/ui/StarRating";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { BookingReceipt } from "@/components/BookingReceipt";
import { type BookingPaymentReceipt, type BookingRecord } from "@/lib/api";
import { type BookingReceiptData } from "@/lib/bookingReceipt";

interface ExperienceSummary {
  id: string;
  title: string;
  duration_minutes: number;
  location: string | null;
  image_url: string | null;
  guide: { id: string; full_name: string; rating_avg: number; rating_count: number } | null;
}

export function BookingConfirmation({
  booking,
  experience,
  paymentMethod,
  paymentReceipt,
  slotDate,
  slotTime,
}: {
  booking: BookingRecord;
  experience: ExperienceSummary;
  paymentMethod?: string;
  paymentReceipt?: BookingPaymentReceipt | null;
  slotDate?: string;
  slotTime?: string;
}) {
  const steps = [
    "Meet your guide at the agreed location and time.",
    "When your tour is done, open My trips on your phone.",
    "Tap End trip. Your guide enters the 6-digit PIN or scans your QR code.",
    "Rate your experience to help other tourists choose.",
  ];

  const receiptData: BookingReceiptData = {
    bookingId: booking.bookingId,
    createdAt: booking.createdAt,
    experienceTitle: experience.title,
    guideName: experience.guide?.full_name ?? booking.guideName,
    location: experience.location,
    durationMinutes: experience.duration_minutes,
    guestCount: booking.guestCount ?? booking.adults ?? 1,
    slotDate,
    slotTime,
    payment: paymentReceipt
      ? {
          method: paymentReceipt.method,
          amountUsdc: paymentReceipt.amountUsdc,
          amountKes: paymentReceipt.amountKes,
          mpesaReceipt: paymentReceipt.mpesaReceipt,
          paidAt: paymentReceipt.paidAt,
          paymentIntentId: paymentReceipt.paymentIntentId,
        }
      : paymentMethod
        ? {
            method: paymentMethod,
            amountUsdc: booking.amountUsdc,
            amountKes: null,
            mpesaReceipt: null,
            paidAt: booking.createdAt,
          }
        : null,
    lockTxHash: booking.lockTxHash,
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <MobilePageBanner eyebrow="Booked" title="You're all set" tone="amber" />

      <Card className="overflow-hidden p-0 text-left">
        <div className="bg-gradient-to-br from-brand-accent/20 to-brand-blueDark/5 px-6 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-success/15 text-2xl">
            ✓
          </div>
          <h1 className="mt-4 text-xl font-bold text-brand-blueDark">Booking confirmed</h1>
          <p className="mt-1 text-sm text-brand-muted">Payment secured in escrow</p>
          <div className="mt-3 flex justify-center">
            <Chip tone="locked" />
          </div>
        </div>

        <div className="border-t border-brand-border p-6">
          <ExperiencePhoto
            src={experience.image_url}
            alt={experience.title}
            className="aspect-[16/9] w-full rounded-xl"
          />
          <div className="mt-4">
            <h2 className="text-lg font-bold text-brand-blueDark">{experience.title}</h2>
            <p className="text-sm text-brand-muted">with {experience.guide?.full_name}</p>
            <StarRating
              value={experience.guide?.rating_avg ?? 0}
              count={experience.guide?.rating_count ?? 0}
              className="mt-1"
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {experience.location && (
              <div>
                <dt className="text-brand-muted">Location</dt>
                <dd className="font-medium text-brand-blueDark">{experience.location}</dd>
              </div>
            )}
            <div>
              <dt className="text-brand-muted">Duration</dt>
              <dd className="font-medium text-brand-blueDark">{experience.duration_minutes} min</dd>
            </div>
            {slotDate && (
              <div className="col-span-2">
                <dt className="text-brand-muted">When</dt>
                <dd className="font-medium text-brand-blueDark">
                  {slotDate}
                  {slotTime ? ` · ${slotTime}` : ""}
                </dd>
              </div>
            )}
            {paymentMethod && (
              <div>
                <dt className="text-brand-muted">Paid via</dt>
                <dd className="font-medium capitalize text-brand-blueDark">{paymentMethod}</dd>
              </div>
            )}
          </dl>
        </div>
      </Card>

      <BookingReceipt data={receiptData} />

      <Card className="p-6 text-left">
        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-muted">What happens next</h3>
        <ol className="mt-3 space-y-3">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-accent/15 text-xs font-bold text-brand-accent">
                {i + 1}
              </span>
              <span className="text-brand-muted">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/tourist/bookings" className="flex-1">
          <Button variant="primary" className="w-full">
            View my trip
          </Button>
        </Link>
        <Link href="/explore" className="flex-1">
          <Button variant="secondary" className="w-full">
            Explore more
          </Button>
        </Link>
      </div>
    </div>
  );
}
