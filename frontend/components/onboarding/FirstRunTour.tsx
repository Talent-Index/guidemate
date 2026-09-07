"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isInternalUser } from "@/lib/auth/roles";

const GUIDE_STEPS = [
  {
    title: "Dashboard home",
    body: "Listings, booked tours, and payouts live here. Publish an experience when you are ready to take bookings.",
  },
  {
    title: "Publish an experience",
    body: "Add a title, photos, price, and location. Active listings are what tourists see on Explore.",
  },
  {
    title: "Wallet",
    body: "Tour earnings land in your in-app wallet. Withdraw to M-Pesa from the Wallet page when you are ready.",
  },
  {
    title: "Active tour PIN / QR",
    body: "When a tourist pays, open Tour. Enter their 6-digit PIN or scan their QR to complete the trip.",
  },
  {
    title: "Live",
    body: "Go live for a paid stream. Viewers join from the Live tab — tips and tickets settle on-chain.",
  },
  {
    title: "Messages",
    body: "Chat with booked tourists about meeting points, timing, and last-minute details.",
  },
] as const;

const TOURIST_STEPS = [
  {
    title: "Explore / AI match",
    body: "Browse listings or describe what you want. The match agent picks a guide and experience for you.",
  },
  {
    title: "Book and pay",
    body: "Pay with M-Pesa, your in-app balance, or a connected wallet. Funds lock until the tour is complete.",
  },
  {
    title: "Trips and End trip",
    body: "Open Bookings for upcoming trips. Tap End trip to show your PIN or QR so the guide can confirm.",
  },
  {
    title: "Wallet",
    body: "Connect MetaMask or Core, see AVAX and mUSDC, and keep an in-app balance for bookings.",
  },
  {
    title: "Live",
    body: "Watch live tours and pay-per-view streams. Join from the Live tab when a guide is on air.",
  },
  {
    title: "Messages",
    body: "Message your guide after you book — meeting point, timing, and anything else you need.",
  },
] as const;

function storageKey(userId: string) {
  return `guidemate-tour-v1-${userId}`;
}

export function FirstRunTour() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user || !profile || isInternalUser(profile.role)) return;
    try {
      if (localStorage.getItem(storageKey(user.id))) return;
      setOpen(true);
      setStep(0);
    } catch {
      /* ignore storage errors */
    }
  }, [user, profile]);

  function dismiss() {
    if (user) {
      try {
        localStorage.setItem(storageKey(user.id), "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  if (!open || !profile || isInternalUser(profile.role)) return null;

  const steps = profile.role === "guide" ? GUIDE_STEPS : TOURIST_STEPS;
  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-tour-title"
        className="w-full max-w-md rounded-3xl border border-brand-border bg-[var(--gm-canvas)] p-6 shadow-card"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Step {step + 1} of {steps.length}
        </p>
        <h2 id="first-run-tour-title" className="mt-2 text-xl font-bold text-brand-blueDark">
          {current.title}
        </h2>
        <p className="mt-2 text-sm text-brand-muted">{current.body}</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-semibold text-brand-muted hover:text-brand-blueDark"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" type="button" onClick={() => setStep((n) => n - 1)}>
                Back
              </Button>
            )}
            <Button variant="primary" type="button" onClick={() => (last ? dismiss() : setStep((n) => n + 1))}>
              {last ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
