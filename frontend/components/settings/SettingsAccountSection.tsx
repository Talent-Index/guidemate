import { SignOutSection } from "@/components/SignOutSection";
import { SettingsSection } from "@/components/settings/SettingsSection";

export function SettingsAccountSection() {
  return (
    <SettingsSection title="Account" description="Sign out of Guidemate on this device.">
      <SignOutSection embedded />
    </SettingsSection>
  );
}
