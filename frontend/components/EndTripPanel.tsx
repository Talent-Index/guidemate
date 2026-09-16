"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { getCompletionCode, getCompletionQrValue } from "@/lib/api";

export function EndTripPanel({ bookingId, accessToken }: { bookingId: string; accessToken?: string }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getCompletionCode(bookingId, accessToken)
      .then(({ qrToken: token, pin: nextPin }) => {
        if (cancelled) return;
        setQrToken(token);
        setPin(nextPin);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [open, bookingId, accessToken]);

  if (!open) {
    return (
      <div className="mt-3">
        <Button variant="primary" className="w-full" onClick={() => setOpen(true)}>
          End trip
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-border bg-brand-bg p-4">
      <p className="text-sm font-semibold text-brand-blueDark">Show your guide</p>
      <ul className="mt-2 space-y-1 text-xs text-brand-muted">
        <li>· PIN below, or</li>
        <li>· QR for them to scan</li>
      </ul>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {pin && (
        <p className="mt-4 text-center font-mono text-4xl font-bold tracking-[0.35em] text-brand-blueDark">
          {pin}
        </p>
      )}

      {qrToken && (
        <div className="mt-4 flex justify-center bg-white p-3">
          <QRCodeSVG value={getCompletionQrValue(qrToken)} size={160} />
        </div>
      )}

      <button
        type="button"
        className="mt-3 w-full text-xs font-semibold text-brand-muted hover:text-brand-blueDark"
        onClick={() => setOpen(false)}
      >
        Hide
      </button>
    </div>
  );
}
