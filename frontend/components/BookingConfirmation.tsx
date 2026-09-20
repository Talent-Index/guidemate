"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BookingReceipt } from "@/components/BookingReceipt";
import { type BookingPaymentReceipt, type BookingRecord } from "@/lib/api";
import { type BookingReceiptData } from "@/lib/bookingReceipt";

interface ExperienceSummary {
  id: string;
  title: string;
  duration_minutes: number;
  location: string | null;
  guide: { id: string; full_name: string } | null;
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
    <div className="mx-auto flex max-w-md flex-col gap-6 py-4">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-success/15 text-xl text-brand-success">
          ✓
        </div>
        <h1 className="mt-3 text-xl font-bold text-brand-blueDark">You&apos;re booked</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Payment is in escrow until you finish the trip and tap <strong className="font-semibold text-brand-blueDark">End trip</strong>.
        </p>
      </div>

      <BookingReceipt data={receiptData} />

      <div className="flex flex-col gap-2">
        <Link href="/tourist/bookings">
          <Button variant="primary" className="w-full">
            View my trip
          </Button>
        </Link>
        <Link href={`/chat/${booking.bookingId}`}>
          <Button variant="secondary" className="w-full">
            Message your guide
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="secondary" className="w-full">
            Explore more experiences
          </Button>
        </Link>
      </div>
    </div>
  );
}
