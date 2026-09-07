import { Children, type ReactNode } from "react";
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
  const childArray = Children.toArray(children);
  const [profileSection, ...otherSections] = childArray;

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <MobilePageBanner eyebrow="Account" title={title ?? "Settings"} />
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-brand-blueDark">{title ?? "Settings"}</h1>
          <p className="text-sm text-brand-muted">{subtitle}</p>
        </div>
        <p className="mt-3 text-sm text-brand-muted md:hidden">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-6">
        <div>{profileSection}</div>
        {otherSections.length > 0 && <div className="flex flex-col gap-6">{otherSections}</div>}
      </div>
    </div>
  );
}
