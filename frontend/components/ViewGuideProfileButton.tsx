import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function ViewGuideProfileButton({
  guideId,
  className = "",
  fullWidth = false,
}: {
  guideId: string;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <Link href={`/guides/${guideId}`} className={className}>
      <Button type="button" variant="secondary" className={fullWidth ? "w-full" : undefined}>
        View guide profile
      </Button>
    </Link>
  );
}
