"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
  showCount?: boolean;
}

/** Read-only star rating, e.g. "★★★★☆ 4.3 (12)". Shows a neutral placeholder until a guide has any reviews. */
export function StarRating({ value, count, size = "sm", className = "", showCount = true }: StarRatingProps) {
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (!count) {
    return <span className={`${textSize} text-brand-muted ${className}`}>No ratings yet</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${textSize} ${className}`}>
      <Stars value={value} size={size} />
      <span className="font-semibold text-brand-blueDark">{value.toFixed(1)}</span>
      {showCount && (
        <span className="text-brand-muted">
          ({count} {count === 1 ? "review" : "reviews"})
        </span>
      )}
    </span>
  );
}

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const starSize = size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={`${starSize} leading-none text-brand-amber`} aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (n <= Math.round(value) ? "★" : "☆")).join("")}
    </span>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

/** Interactive 1-5 star picker for a tourist to rate their guide after a completed tour. */
export function StarRatingInput({ value, onChange, className = "" }: StarRatingInputProps) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl leading-none text-brand-amber transition-transform hover:scale-110"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          {n <= shown ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
