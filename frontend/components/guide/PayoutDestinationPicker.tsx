"use client";

import type { ExperiencePayoutChoice, PayoutDestination } from "@/lib/payoutDestination";

const OPTIONS: {
  id: ExperiencePayoutChoice;
  title: string;
  body: string;
}[] = [
  {
    id: "inherit",
    title: "Use my profile default",
    body: "Follow the payout choice saved on your profile.",
  },
  {
    id: "mpesa",
    title: "Send to M-Pesa",
    body: "Your 85% goes to your M-Pesa number when the tour is verified.",
  },
  {
    id: "wallet",
    title: "Keep in my wallet",
    body: "Your 85% stays in Guidemate. Withdraw to M-Pesa anytime from Wallet.",
  },
];

export function PayoutDestinationPicker({
  value,
  onChange,
  allowInherit = false,
  profileDefault,
}: {
  value: ExperiencePayoutChoice;
  onChange: (value: ExperiencePayoutChoice) => void;
  allowInherit?: boolean;
  profileDefault?: PayoutDestination | null;
}) {
  const inheritBody =
    profileDefault === "wallet"
      ? "Keep earnings in your wallet, then withdraw when you want."
      : "Send earnings to M-Pesa after each completed tour.";

  const options = OPTIONS.filter((option) => allowInherit || option.id !== "inherit").map((option) =>
    option.id === "inherit" ? { ...option, body: inheritBody } : option
  );

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-brand-blueDark">Where should your earnings go?</legend>
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <label
            key={option.id}
            className={`flex cursor-pointer gap-3 rounded-card border p-3 ${
              selected ? "border-brand-accent bg-brand-bg" : "border-brand-border bg-white"
            }`}
          >
            <input
              type="radio"
              name="payout-destination"
              className="mt-1"
              checked={selected}
              onChange={() => onChange(option.id)}
            />
            <span>
              <span className="block text-sm font-semibold text-brand-blueDark">{option.title}</span>
              <span className="mt-0.5 block text-xs text-brand-muted">{option.body}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
