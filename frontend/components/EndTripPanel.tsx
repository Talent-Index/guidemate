"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { getCompletionCode, getVerifyUrl } from "@/lib/api";

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
        <p className="mt-2 text-xs text-brand-muted">
          When you arrive, tap End trip and show the code to your guide so they can release payment.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-border bg-brand-bg p-4">
      <p className="text-sm font-semibold text-brand-blueDark">End trip</p>
      <p className="mt-1 text-xs text-brand-muted">
        Show this screen to your guide. They enter the PIN on their phone, or scan the QR, to release escrow.
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {pin && (
        <p className="mt-4 text-center font-mono text-4xl font-bold tracking-[0.35em] text-brand-blueDark">
          {pin}
        </p>
      )}

      {qrToken && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="bg-[#ffffff] p-3">
            <QRCodeSVG value={getVerifyUrl(qrToken)} size={160} />
          </div>
          <p className="text-xs text-brand-muted">Or let your guide scan this QR</p>
        </div>
      )}

      <button
        type="button"
        className="mt-3 w-full text-xs font-semibold text-brand-muted hover:text-brand-blueDark"
        onClick={() => setOpen(false)}
      >
        Hide code
      </button>
    </div>
  );
}
