"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function MessageGuideModal({
  open,
  onClose,
  guideName,
  experienceTitle,
  guideId,
  signedIn,
}: {
  open: boolean;
  onClose: () => void;
  guideName: string;
  experienceTitle: string;
  guideId: string;
  signedIn: boolean;
}) {
  const [message, setMessage] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[var(--gm-surface)] p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-brand-muted hover:text-[var(--gm-ink)]"
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="text-xl font-bold text-[var(--gm-ink)]">Ask {guideName}</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Questions about &quot;{experienceTitle}&quot;? Book first to open a secure chat, or view the guide profile.
        </p>
        <textarea
          className="form-input-light mt-4 min-h-[120px] w-full resize-none rounded-xl border border-brand-border p-3"
          placeholder="Hi! I'm interested in this experience..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minLength={20}
        />
        <p className="mt-1 text-xs text-brand-muted">{message.length}/20 characters</p>
        {signedIn ? (
          <Link href={`/guides/${guideId}`} className="mt-4 block">
            <Button variant="accent" className="w-full" disabled={message.length < 20}>
              View guide & book to message
            </Button>
          </Link>
        ) : (
          <Link href="/auth/sign-in" className="mt-4 block">
            <Button variant="accent" className="w-full">Sign in to continue</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
