import { UnitBanner } from "@/components/ui/Path";

/** Duo-style unit card shown only on the phone canvas. Desktop keeps the existing heading. */
export function MobilePageBanner({
  eyebrow,
  title,
  tone = "blue",
}: {
  eyebrow: string;
  title: string;
  tone?: "amber" | "blue";
}) {
  return (
    <div className="w-full md:hidden">
      <UnitBanner eyebrow={eyebrow} title={title} tone={tone} />
    </div>
  );
}
