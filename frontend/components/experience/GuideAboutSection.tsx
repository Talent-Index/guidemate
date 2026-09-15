"use client";

import { Button } from "@/components/ui/Button";
import { GuideAvatar } from "@/components/ui/GuideAvatar";

export function GuideAboutSection({
  guide,
  guideRole,
  onMessage,
}: {
  guide: {
    full_name: string;
    bio: string | null;
    avatar_url?: string | null;
    languages: string[];
  };
  guideRole: string;
  onMessage: () => void;
}) {
  const firstName = guide.full_name.split(/\s+/)[0];
  const bio =
    guide.bio?.trim() ||
    `I'm a local guide on Guidemate. I love showing visitors the best of my city${
      guide.languages.length ? `. I speak ${guide.languages.join(", ")}` : ""
    }.`;

  return (
    <section>
      <h2 className="text-[22px] font-bold text-[var(--gm-ink)]">About me</h2>
      <div className="mt-6 grid gap-8 sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] sm:items-start">
        <div>
          <div className="rounded-2xl border border-brand-border bg-[var(--gm-surface)] px-6 py-8 text-center shadow-sm">
            <GuideAvatar name={guide.full_name} avatarUrl={guide.avatar_url} size="xl" className="mx-auto" />
            <p className="mt-4 text-lg font-bold text-[var(--gm-ink)]">{guide.full_name}</p>
            <p className="text-sm text-brand-muted">{guideRole}</p>
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={onMessage}>
            Message {firstName}
          </Button>
          <p className="mt-3 text-center text-xs leading-relaxed text-brand-muted">
            To help protect your payment, always use Guidemate to send money and communicate with hosts.
          </p>
        </div>
        <p className="text-sm leading-relaxed text-brand-muted sm:pt-2">{bio}</p>
      </div>
    </section>
  );
}
