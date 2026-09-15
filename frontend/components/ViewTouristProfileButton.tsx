"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ViewTouristProfileButton({
  touristId,
  className = "",
  fullWidth = false,
  variant = "button",
}: {
  touristId: string;
  className?: string;
  fullWidth?: boolean;
  variant?: "button" | "link";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = encodeURIComponent(query ? `${pathname}?${query}` : pathname);
  const href = `/tourists/${touristId}?returnTo=${returnTo}`;

  if (variant === "link") {
    return (
      <Link href={href} className={`text-sm font-semibold text-brand-accent hover:underline ${className}`}>
        View profile
      </Link>
    );
  }

  return (
    <Link href={href} className={className}>
      <Button type="button" variant="secondary" className={fullWidth ? "w-full" : undefined}>
        View tourist profile
      </Button>
    </Link>
  );
}
