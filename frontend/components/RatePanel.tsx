"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StarRating, StarRatingInput } from "@/components/ui/StarRating";
import type { RatingInfo } from "@/lib/api";

export function RatePanel({
  title,
  subtitle,
  existing,
  placeholder,
  disabled,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  existing: RatingInfo | null;
  placeholder: string;
  disabled?: boolean;
  onSubmit: (stars: number, comment: string) => Promise<RatingInfo>;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existing) {
    return (
      <div className="mt-3 rounded-lg bg-brand-bg p-3">
        <p className="text-xs font-semibold text-brand-muted">{title}</p>
        <StarRating value={existing.stars} count={1} showCount={false} className="mt-1" />
        {existing.comment && <p className="mt-1 text-sm text-brand-muted">&quot;{existing.comment}&quot;</p>}
      </div>
    );
  }

  async function handleSubmit() {
    if (stars < 1 || disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(stars, comment.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-border p-3">
      <p className="text-sm font-semibold text-brand-blueDark">{title}</p>
      <p className="text-xs text-brand-muted">{subtitle}</p>
      <StarRatingInput value={stars} onChange={setStars} className="mt-2" />
      <textarea
        className="form-input-light mt-2 resize-none"
        rows={2}
        placeholder={placeholder}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <Button variant="primary" className="mt-2" disabled={stars < 1 || submitting || disabled} onClick={() => void handleSubmit()}>
        {submitting ? "Submitting..." : "Submit rating"}
      </Button>
    </div>
  );
}
