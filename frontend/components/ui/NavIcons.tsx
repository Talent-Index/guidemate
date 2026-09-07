import type { ReactNode } from "react";

export function NavIconFrame({
  active,
  className = "h-[22px] w-[22px]",
  children,
}: {
  active: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function HomeNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <path d="M4.2 10.4 12 3.8l7.8 6.6v9.1a1.4 1.4 0 0 1-1.4 1.4h-4.1v-5.4H9.7v5.4H5.6a1.4 1.4 0 0 1-1.4-1.4v-9.1z" />
    </NavIconFrame>
  );
}

export function CompassNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <circle cx="12" cy="12" r="8.2" fill={active ? "currentColor" : "none"} />
      {active ? (
        <path d="M12 7.4 15.2 16l-3.2-1.6L8.8 16z" fill="#111111" />
      ) : (
        <path d="M12 7.6 15.1 15.8 12 14.3 8.9 15.8z" />
      )}
    </NavIconFrame>
  );
}

export function LiveNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <rect x="3.4" y="5.6" width="13.2" height="12.8" rx="2.4" />
      <path d="M16.6 9.6 20.6 7.4v9.2l-4-2.2" />
      {active ? (
        <path d="M8 9.4v5.2l4.4-2.6z" fill="#111111" />
      ) : (
        <path d="M8.2 9.6v4.8l4.2-2.4z" />
      )}
    </NavIconFrame>
  );
}

export function BookingsNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <path d="M7.2 4.2h9.6a1.6 1.6 0 0 1 1.6 1.6V20l-6.4-2.6L5.6 20V5.8a1.6 1.6 0 0 1 1.6-1.6z" />
      {active ? null : <path d="M9 8.4h6M9 11.6h4.2" />}
    </NavIconFrame>
  );
}

export function TourNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <path d="M12 21s6.4-5.4 6.4-10.2A6.4 6.4 0 0 0 5.6 10.8C5.6 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.1" fill={active ? "#111111" : "none"} />
    </NavIconFrame>
  );
}

export function DashboardNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <rect x="3.6" y="3.6" width="7.2" height="7.2" rx="1.6" />
      <rect x="13.2" y="3.6" width="7.2" height="4.6" rx="1.6" />
      <rect x="3.6" y="13.2" width="7.2" height="7.2" rx="1.6" />
      <rect x="13.2" y="10.6" width="7.2" height="9.8" rx="1.6" />
    </NavIconFrame>
  );
}

export function MessagesNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <path d="M5 5.8h14a1.4 1.4 0 0 1 1.4 1.4v7.2a1.4 1.4 0 0 1-1.4 1.4H9.4L5 20.2V7.2A1.4 1.4 0 0 1 5 5.8z" />
      {active ? null : <path d="M8 10h8M8 13h5" />}
    </NavIconFrame>
  );
}

export function WalletNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <path d="M4.4 7.2h15.2a1.6 1.6 0 0 1 1.6 1.6v8.4a1.6 1.6 0 0 1-1.6 1.6H4.4A1.6 1.6 0 0 1 2.8 17.2V8.8A1.6 1.6 0 0 1 4.4 7.2z" />
      <path d="M2.8 9.6h18.4" />
      <circle cx="16.4" cy="14.2" r="1.2" fill={active ? "#111111" : "currentColor"} />
    </NavIconFrame>
  );
}

export function SettingsNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <circle cx="12" cy="12" r="2.6" fill={active ? "#111111" : "none"} />
      <path d="M12 2.8v2.1M12 19.1v2.1M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2.8 12h2.1M19.1 12h2.1M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" />
    </NavIconFrame>
  );
}

export function AnalyticsNavIcon({ active }: { active: boolean }) {
  return (
    <NavIconFrame active={active}>
      <path d="M4.5 19.5V9.8M10 19.5V4.5M15.5 19.5v-7M21 19.5v-11" />
    </NavIconFrame>
  );
}
