import { GuideAvatar } from "@/components/ui/GuideAvatar";
import { PinIcon, ClockIcon } from "@/components/experience/ExperienceInfoIcons";

export function ExperienceMetaList({
  guideName,
  guideRole,
  guideAvatarUrl,
  location,
  durationHours,
  languages,
  onHostClick,
}: {
  guideName: string;
  guideRole: string;
  guideAvatarUrl?: string | null;
  location: string | null;
  durationHours?: number | null;
  languages: string[];
  onHostClick?: () => void;
}) {
  const langText = languages.length > 0 ? languages.join(", ") : "English";

  return (
    <div className="divide-y divide-brand-border rounded-2xl border border-brand-border">
      <button
        type="button"
        onClick={onHostClick}
        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-brand-bg/60"
      >
        <GuideAvatar name={guideName} avatarUrl={guideAvatarUrl} size="lg" />
        <div>
          <p className="font-semibold text-[var(--gm-ink)]">Hosted by {guideName}</p>
          <p className="text-sm text-brand-muted">{guideRole}</p>
        </div>
      </button>

      {location && (
        <div className="flex items-center gap-4 p-4">
          <PinIcon />
          <div>
            <p className="font-semibold text-[var(--gm-ink)]">{location}</p>
            <p className="text-sm text-brand-muted">Nairobi, Kenya</p>
          </div>
        </div>
      )}

      {durationHours != null && durationHours > 0 && (
        <div className="flex items-center gap-4 p-4">
          <ClockIcon />
          <div>
            <p className="font-semibold text-[var(--gm-ink)]">Around {durationHours} hr experience</p>
            <p className="text-sm text-brand-muted">Offered in {langText}</p>
          </div>
        </div>
      )}

      {(durationHours == null || durationHours <= 0) && (
        <div className="flex items-center gap-4 p-4">
          <ClockIcon />
          <div>
            <p className="font-semibold text-[var(--gm-ink)]">Times vary by date</p>
            <p className="text-sm text-brand-muted">Offered in {langText}</p>
          </div>
        </div>
      )}
    </div>
  );
}
