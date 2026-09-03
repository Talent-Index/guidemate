import Link from "next/link";
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
  return (
    <Link href={`/tourists/${touristId}`} className={className}>
      <Button type="button" variant="secondary" className={fullWidth ? "w-full" : undefined}>
        View tourist profile
      </Button>
    </Link>
  );
}
