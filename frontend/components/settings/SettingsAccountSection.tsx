import { SignOutSection } from "@/components/SignOutSection";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SettingsSection } from "@/components/settings/SettingsSection";

export function SettingsAccountSection() {
  return (
    <SettingsSection title="Account" description="Appearance and sign out on this device.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-blueDark">Appearance</p>
          <p className="text-xs text-brand-muted">Switch between light and dark mode.</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="mt-4 border-t border-brand-border pt-4">
        <SignOutSection embedded />
      </div>
    </SettingsSection>
  );
}
