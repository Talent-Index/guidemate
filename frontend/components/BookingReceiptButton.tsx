"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BookingReceipt } from "@/components/BookingReceipt";
import { getBookingPaymentReceipt, type BookingRecord } from "@/lib/api";
import { type BookingReceiptData } from "@/lib/bookingReceipt";

export function BookingReceiptButton({
  booking,
  accessToken,
  paymentMethod,
}: {
  booking: BookingRecord;
  accessToken: string;
  paymentMethod?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BookingReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openReceipt() {
    setOpen(true);
    if (data) return;
    setLoading(true);
    setError(null);
    try {
      const { paymentReceipt } = await getBookingPaymentReceipt(booking.bookingId, accessToken);
      setData({
        bookingId: booking.bookingId,
        createdAt: booking.createdAt,
        experienceTitle: booking.experienceTitle ?? "Experience",
        guideName: booking.guideName,
        location: booking.experienceLocation,
        durationMinutes: booking.experienceDurationMinutes ?? 0,
        guestCount: booking.guestCount ?? 1,
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
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" className="mt-2 w-full sm:w-auto" onClick={openReceipt}>
        View receipt
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8">
      <div className="relative w-full max-w-md rounded-card bg-brand-bg p-4 shadow-card">
        <button
          type="button"
          className="absolute right-3 top-3 text-sm text-brand-muted hover:text-brand-blueDark"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
        {loading && <p className="py-12 text-center text-sm text-brand-muted">Loading receipt…</p>}
        {error && <p className="py-8 text-center text-sm text-red-600">{error}</p>}
        {data && <BookingReceipt data={data} />}
      </div>
    </div>
  );
}
