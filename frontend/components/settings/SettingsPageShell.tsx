import type { ReactNode } from "react";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";

export function SettingsPageShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <MobilePageBanner eyebrow="Account" title={title ?? "Settings"} />
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-brand-blueDark">{title ?? "Settings"}</h1>
          <p className="text-sm text-brand-muted">{subtitle}</p>
        </div>
        <p className="mt-3 text-sm text-brand-muted md:hidden">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
