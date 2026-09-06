"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { Profile } from "@/lib/auth/AuthProvider";

export type WelcomeAction = {
  label: string;
  description: string;
  href: string;
  scrollToId?: string;
};

function firstName(fullName: string | null): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}

export function isNewUser(profile: Profile): boolean {
  if (profile.createdAt) {
    const days = (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 7) return true;
  }
  return !profile.phone?.trim() || !profile.fullName?.trim();
}

function dismissKey(userId: string) {
  return `guidemate_welcome_dismissed_${userId}`;
}

export function WelcomeTodayCard({ profile, actions }: { profile: Profile; actions: WelcomeAction[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const name = firstName(profile.fullName);
  const isNew = isNewUser(profile);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(localStorage.getItem(dismissKey(profile.id)) === "1");
  }, [profile.id]);

  function handleDismiss() {
    localStorage.setItem(dismissKey(profile.id), "1");
    setCollapsed(true);
  }

  if (collapsed) {
    return (
      <Card className="border-brand-amber/30 bg-brand-amber/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-blueDark">
            Hi, {name}. Here&apos;s what you can do today.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(dismissKey(profile.id));
              setCollapsed(false);
            }}
            className="text-xs font-semibold text-brand-accent hover:underline"
          >
            Show tips
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-brand-amber/30 bg-brand-amber/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-accent">
            {isNew ? "Welcome to Guidemate" : "Welcome back"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-brand-blueDark">Hi, {name}</h2>
          <p className="mt-1 text-sm text-brand-muted">Here&apos;s what you can do today.</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-semibold text-brand-muted hover:text-brand-accent"
          aria-label="Dismiss welcome tips"
        >
          Dismiss
        </button>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <li key={action.label}>
            {action.scrollToId ? (
              <a
                href={`#${action.scrollToId}`}
                className="block rounded-2xl border border-brand-border bg-white p-3 transition hover:border-brand-accent"
              >
                <ActionContent action={action} />
              </a>
            ) : (
              <Link
                href={action.href}
                className="block rounded-2xl border border-brand-border bg-white p-3 transition hover:border-brand-accent"
              >
                <ActionContent action={action} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ActionContent({ action }: { action: WelcomeAction }) {
  return (
    <>
      <p className="text-sm font-semibold text-brand-blueDark">{action.label}</p>
      <p className="mt-0.5 text-xs text-brand-muted">{action.description}</p>
    </>
  );
}
