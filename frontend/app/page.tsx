import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-8 py-10 text-center">
      <div>
        <h1 className="text-4xl font-bold text-brand-blueDark">Guidemate</h1>
        <p className="mt-3 max-w-xl text-brand-muted">
          Vetted local guides for your guests, booked in seconds and paid instantly to M-Pesa on
          Avalanche - so guides never wait weeks to get paid again.
        </p>
      </div>
      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        <Card className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm font-semibold text-brand-accent">Step 1</span>
          <p className="text-sm text-brand-muted">Concierge requests an excursion</p>
          <Link href="/concierge" className="mt-auto w-full">
            <Button className="w-full" variant="accent">
              Open Concierge
            </Button>
          </Link>
        </Card>
        <Card className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm font-semibold text-brand-accent">Step 2</span>
          <p className="text-sm text-brand-muted">Guide shows their completion QR</p>
          <Link href="/guide" className="mt-auto w-full">
            <Button className="w-full" variant="accent">
              Open Guide View
            </Button>
          </Link>
        </Card>
        <Card className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm font-semibold text-brand-accent">Step 3</span>
          <p className="text-sm text-brand-muted">Tourist scans to verify &amp; settle</p>
          <Link href="/verify" className="mt-auto w-full">
            <Button className="w-full" variant="accent">
              Open Verify
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
