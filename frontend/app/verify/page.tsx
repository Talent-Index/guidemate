"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QrScanner } from "@/components/QrScanner";
import { completeBooking, type BookingRecord } from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export default function VerifyPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      void runComplete(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runComplete(token: string) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const extracted = extractToken(token);
      const { booking: completed } = await completeBooking(extracted);
      setBooking(completed);
      setStatus("success");
    } catch (err) {
      setErrorMessage((err as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Verify Tour Completion</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Scan the guide&apos;s QR code, or paste the token below, to release payment.
        </p>

        {status === "idle" && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <QrScanner onScan={(text) => runComplete(text)} />
            <div className="flex w-full gap-2">
              <input
                className="flex-1 rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-accent"
                placeholder="Paste QR token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
              />
              <Button variant="secondary" disabled={!manualToken} onClick={() => runComplete(manualToken)}>
                Verify
              </Button>
            </div>
          </div>
        )}

        {status === "loading" && (
          <p className="mt-8 text-sm text-brand-muted">Verifying on-chain and releasing funds...</p>
        )}

        {status === "success" && booking && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="rounded-full bg-brand-successBg p-4">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-lg font-bold text-brand-success">Tour Verified</p>
            <p className="text-sm text-brand-muted">
              {booking.guideName}&apos;s payout of {booking.splits?.guideAmount.toFixed(2)} USDC is on its way.
            </p>
            {booking.payout && (
              <p className="text-sm font-medium text-brand-blueDark">
                KES {booking.payout.kesAmount.toLocaleString()} → {booking.payout.phone}
              </p>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <Button variant="secondary" onClick={() => setStatus("idle")}>
              Try again
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function extractToken(scanned: string): string {
  try {
    const url = new URL(scanned);
    const token = url.searchParams.get("token");
    if (token) return token;
  } catch {
    // not a URL - assume the scanned/pasted text is the raw token
  }
  return scanned;
}
