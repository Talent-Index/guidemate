import type { ReactNode } from "react";

export function InfoIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-border text-brand-blueDark"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        {children}
      </svg>
    </span>
  );
}

export function UsersIcon() {
  return (
    <InfoIcon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </InfoIcon>
  );
}

export function WalkIcon() {
  return (
    <InfoIcon>
      <circle cx="12" cy="5" r="2" />
      <path d="m12 7 1 4-2 1 2 5-1 5" />
    </InfoIcon>
  );
}

export function BagIcon() {
  return (
    <InfoIcon>
      <path d="M6 8h12l-1 13H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </InfoIcon>
  );
}

export function LanguageIcon() {
  return (
    <InfoIcon>
      <path d="M4 5h8M8 5v14M4 12h8" />
      <path d="M14 8h6M17 8v8M14 16h6" />
    </InfoIcon>
  );
}

export function PinIcon() {
  return (
    <InfoIcon>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </InfoIcon>
  );
}

export function CalendarIcon() {
  return (
    <InfoIcon>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </InfoIcon>
  );
}

export function ClockIcon() {
  return (
    <InfoIcon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </InfoIcon>
  );
}
