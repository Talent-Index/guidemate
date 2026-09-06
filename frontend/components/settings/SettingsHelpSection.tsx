import Link from "next/link";
import { SettingsSection } from "@/components/settings/SettingsSection";

const FAQ_TIPS = [
  "Browse experiences on Explore, or describe what you want and let AI find a match.",
  "Book with M-Pesa or crypto — your wallet balance is in Settings under Wallet.",
  "Message your guide from the Bookings page once a trip is confirmed.",
];

const GUIDE_FAQ_TIPS = [
  "Complete your profile and M-Pesa number so you can receive payouts.",
  "Publish at least one experience so tourists can find and book you.",
  "Go live from the Live tab to stream and earn tips from viewers.",
];

export function SettingsHelpSection({ role }: { role: "tourist" | "guide" | "admin" }) {
  const tips = role === "guide" ? GUIDE_FAQ_TIPS : FAQ_TIPS;

  return (
    <SettingsSection title="Help & support" description="Quick tips and legal information.">
      <ul className="list-disc space-y-2 pl-5 text-sm text-brand-muted">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 border-t border-brand-border pt-4 text-sm">
        <Link href="/terms" className="font-semibold text-brand-accent hover:underline">
          Terms and conditions
        </Link>
        {role === "guide" && (
          <Link href="/guide/terms" className="font-semibold text-brand-accent hover:underline">
            Guide terms
          </Link>
        )}
        <Link href="/privacy" className="font-semibold text-brand-accent hover:underline">
          Privacy policy
        </Link>
        <Link href="/accessibility" className="font-semibold text-brand-accent hover:underline">
          Accessibility statement
        </Link>
      </div>
    </SettingsSection>
  );
}
