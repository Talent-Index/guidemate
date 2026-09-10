"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Price } from "@/lib/fx";

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-bg/40 px-4 py-3">
      <span className="font-medium text-brand-blueDark">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border text-lg font-bold text-brand-blueDark disabled:opacity-40"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-bold text-brand-blueDark">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border text-lg font-bold text-brand-blueDark disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function GuestCountModal({
  open,
  onClose,
  priceUsdc,
  maxGuests,
  initialAdults = 2,
  initialChildren = 0,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  priceUsdc: number;
  maxGuests: number;
  initialAdults?: number;
  initialChildren?: number;
  onConfirm: (adults: number, children: number) => void;
}) {
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAdults(Math.min(initialAdults, maxGuests));
    setChildren(Math.min(initialChildren, Math.max(0, maxGuests - initialAdults)));
    setError(null);
  }, [open, initialAdults, initialChildren, maxGuests]);

  if (!open) return null;

  const totalGuests = adults + children;
  const totalUsdc = Math.round(priceUsdc * totalGuests * 100) / 100;

  function handleAdultsChange(next: number) {
    const capped = Math.min(next, maxGuests - children);
    setAdults(Math.max(1, capped));
    setError(null);
  }

  function handleChildrenChange(next: number) {
    const capped = Math.min(next, maxGuests - adults);
    setChildren(Math.max(0, capped));
    setError(null);
  }

  function handleConfirm() {
    if (adults < 1) {
      setError("At least one adult is required.");
      return;
    }
    if (totalGuests > maxGuests) {
      setError(`This slot allows up to ${maxGuests} guest${maxGuests === 1 ? "" : "s"}.`);
      return;
    }
    onConfirm(adults, children);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[var(--gm-surface)] p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-bg"
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="text-xl font-bold text-brand-blueDark">Who&apos;s coming?</h2>
        <p className="mt-1 text-sm text-brand-muted">
          The host charges per guest. This slot fits up to {maxGuests} guest{maxGuests === 1 ? "" : "s"}.
        </p>

        <div className="mt-6 space-y-3">
          <Stepper label="Adults" value={adults} min={1} max={maxGuests} onChange={handleAdultsChange} />
          <Stepper label="Children" value={children} min={0} max={maxGuests} onChange={handleChildrenChange} />
        </div>

        <div className="mt-6 rounded-xl border border-brand-border bg-brand-bg/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-blueDark">
                {totalGuests} guest{totalGuests !== 1 ? "s" : ""} total
              </p>
              <p className="mt-0.5 text-xs text-brand-muted">
                {adults} adult{adults !== 1 ? "s" : ""}
                {children > 0 ? ` · ${children} child${children !== 1 ? "ren" : ""}` : ""}
              </p>
            </div>
            <Price amountUsdc={totalUsdc} size="sm" align="end" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" className="flex-1" onClick={handleConfirm}>
            Continue to book
          </Button>
        </div>
      </div>
    </div>
  );
}
