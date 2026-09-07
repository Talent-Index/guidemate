"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GuideAvatar } from "@/components/ui/GuideAvatar";
import { StarRating } from "@/components/ui/StarRating";

export function GuideAboutModal({
  open,
  onClose,
  guide,
}: {
  open: boolean;
  onClose: () => void;
  guide: {
    id: string;
    full_name: string;
    bio: string | null;
    avatar_url?: string | null;
    languages: string[];
    rating_avg: number;
    rating_count: number;
  };
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--gm-surface)] p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-bg"
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="text-xl font-bold text-[var(--gm-ink)]">About me</h2>
        <div className="mt-6 flex flex-col items-center text-center">
          <GuideAvatar name={guide.full_name} avatarUrl={guide.avatar_url} size="xl" />
          <p className="mt-4 text-lg font-bold text-[var(--gm-ink)]">{guide.full_name}</p>
          <p className="text-sm text-brand-muted">Guidemate host</p>
          {guide.rating_count > 0 && (
            <div className="mt-2">
              <StarRating value={guide.rating_avg} count={guide.rating_count} size="sm" />
            </div>
          )}
        </div>
        <p className="mt-6 text-sm leading-relaxed text-brand-muted">
          {guide.bio?.trim() ||
            `I'm a local guide on Guidemate. I love showing visitors the best of my city${
              guide.languages.length ? `. I speak ${guide.languages.join(", ")}` : ""
            }.`}
        </p>
        <Link href={`/guides/${guide.id}`} className="mt-6 block">
          <Button variant="secondary" className="w-full">View full profile</Button>
        </Link>
        <p className="mt-4 text-center text-xs text-brand-muted">
          To help protect your payment, always use Guidemate to book and message hosts.
        </p>
      </div>
    </div>
  );
}
