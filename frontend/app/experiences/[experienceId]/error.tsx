"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ExperienceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-sm font-semibold text-brand-blueDark">This experience could not be opened.</p>
      <p className="mt-2 text-sm text-brand-muted">Try again, or go back to Explore.</p>
      <div className="mt-4 flex justify-center gap-3">
        <Button variant="secondary" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/explore">
          <Button variant="primary">Back to Explore</Button>
        </Link>
      </div>
    </div>
  );
}
