"use client";

import { CurrencySelect } from "@/lib/fx";
import { firstNameFromProfile, useAuth } from "@/lib/auth/AuthProvider";

function greetingWord() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function GreetingRow({ subtitle }: { subtitle: string }) {
  const { profile, user } = useAuth();
  const first = firstNameFromProfile(profile, user?.email);

  return (
    <div className="hidden items-start justify-between gap-4 md:flex">
      <div>
        <h1 className="text-2xl font-bold text-brand-blueDark">
          {greetingWord()}, {first}
        </h1>
        <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>
      </div>
      <CurrencySelect variant="light" />
    </div>
  );
}
