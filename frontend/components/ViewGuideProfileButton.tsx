"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getGuideSharePath } from "@/lib/share";

export function ViewGuideProfileButton({
  guideId,
  slug,
  className = "",
  fullWidth = false,
}: {
  guideId: string;
  slug?: string | null;
  className?: string;
  fullWidth?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = encodeURIComponent(query ? `${pathname}?${query}` : pathname);

  return (
    <Link href={`${getGuideSharePath(guideId, slug)}?returnTo=${returnTo}`} className={className}>
      <Button type="button" variant="secondary" className={fullWidth ? "w-full" : undefined}>
        View guide profile
      </Button>
    </Link>
  );
}
