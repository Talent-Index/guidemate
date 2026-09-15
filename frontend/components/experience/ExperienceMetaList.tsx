import { GuideAvatar } from "@/components/ui/GuideAvatar";
import { PinIcon } from "@/components/experience/ExperienceInfoIcons";

export function ExperienceMetaList({
  guideName,
  guideRole,
  guideAvatarUrl,
  location,
  onHostClick,
}: {
  guideName: string;
  guideRole: string;
  guideAvatarUrl?: string | null;
  location: string | null;
  durationHours?: number | null;
  languages?: string[];
  onHostClick?: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onHostClick}
        className="flex w-full items-center gap-4 text-left"
      >
        <GuideAvatar name={guideName} avatarUrl={guideAvatarUrl} size="lg" />
        <div>
          <p className="font-semibold text-[var(--gm-ink)]">Hosted by {guideName}</p>
          <p className="text-sm text-brand-muted">{guideRole}</p>
        </div>
      </button>

      {location && (
        <div className="flex items-center gap-4">
          <PinIcon />
          <p className="font-semibold text-[var(--gm-ink)]">{location}</p>
        </div>
      )}
    </div>
  );
}
