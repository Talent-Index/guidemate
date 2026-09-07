"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ViewTouristProfileButton({
  touristId,
  className = "",
  fullWidth = false,
}: {
  touristId: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = encodeURIComponent(query ? `${pathname}?${query}` : pathname);

  return (
    <Link href={`/tourists/${touristId}?returnTo=${returnTo}`} className={className}>
      <Button type="button" variant="secondary" className={fullWidth ? "w-full" : undefined}>
        View tourist profile
      </Button>
    </Link>
  );
}
