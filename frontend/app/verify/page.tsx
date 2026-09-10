"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QrScanner } from "@/components/QrScanner";
import { useAuth } from "@/lib/auth/AuthProvider";
import { completeBooking, type BookingRecord } from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export default function VerifyPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-md text-center text-sm text-brand-muted">Loading…</p>}>
      <VerifyPageContent />
    </Suspense>
  );
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const { loading: authLoading, session, profile } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const urlToken = searchParams.get("token");
  const isGuide = profile?.role === "guide";
  const returnTo = urlToken ? `/verify?token=${encodeURIComponent(urlToken)}` : "/verify";

  useEffect(() => {
    if (urlToken) setPendingToken(urlToken);
  }, [urlToken]);

  async function runComplete(token: string) {
    if (!session) return;
    setStatus("loading");
    setErrorMessage(null);
    try {
      const extracted = extractToken(token);
      const { booking: completed } = await completeBooking(extracted, session.access_token);
      setBooking(completed);
      setStatus("success");
      setPendingToken(null);
    } catch (err) {
      setErrorMessage((err as Error).message);
      setStatus("error");
    }
  }

  if (authLoading) {
    return <p className="mx-auto max-w-md text-center text-sm text-brand-muted">Loading…</p>;
  }

  if (!session || !isGuide) {
    return (
      <div className="flex flex-col items-center gap-6">
        <Card className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-brand-blueDark">Guide sign-in required</h1>
          <p className="mt-2 text-sm text-brand-muted">
            {urlToken
              ? "This End trip QR link releases payment to the assigned guide. Sign in with your guide account to continue."
              : "Sign in as the assigned guide to scan a tourist's End trip QR and release payment."}
          </p>
          {!session && (
            <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`} className="mt-6 inline-block">
              <Button variant="accent">Sign in as guide</Button>
            </Link>
          )}
          {session && !isGuide && (
            <p className="mt-4 text-sm text-red-600">
              You are signed in as a {profile?.role ?? "user"}. Only the assigned guide can verify this tour.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Verify tour completion</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Signed in as {profile.fullName ?? "guide"}. Confirm to release escrow payment to your wallet.
        </p>

        {pendingToken && status === "idle" && (
          <div className="mt-6 rounded-xl border border-brand-accent/30 bg-brand-accent/5 p-4">
            <p className="text-sm text-brand-blueDark">
              A tourist showed you their End trip QR. Tap below to verify the tour and release payment.
            </p>
            <Button variant="accent" className="mt-4 w-full" onClick={() => runComplete(pendingToken)}>
              Release payment
            </Button>
          </div>
        )}

        {!pendingToken && status === "idle" && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <QrScanner onScan={(text) => runComplete(text)} />
            <div className="flex w-full gap-2">
              <input
                className="form-input-light flex-1"
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
          <p className="mt-8 text-sm text-brand-muted">Verifying on-chain and releasing funds…</p>
        )}

        {status === "success" && booking && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="rounded-full bg-brand-successBg p-4">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-lg font-bold text-brand-success">Tour verified</p>
            <p className="text-sm text-brand-muted">
              Your payout of {booking.splits?.guideAmount.toFixed(2)} USDC is on its way.
            </p>
            {booking.payout && (
              <p className="text-sm font-medium text-brand-blueDark">
                KES {booking.payout.kesAmount.toLocaleString()} → {booking.payout.phone}
              </p>
            )}
            <Link href="/guide" className="mt-2">
              <Button variant="secondary">Back to tours</Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setStatus("idle");
                if (urlToken) setPendingToken(urlToken);
              }}
            >
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
