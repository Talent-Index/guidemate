import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import type { ItineraryStep } from "@/lib/itinerary";

export function ExperienceWhatYoullDo({ steps }: { steps: ItineraryStep[] }) {
  if (steps.length === 0) return null;

  return (
    <section>
      <h2 className="text-[22px] font-bold text-[var(--gm-ink)]">What you&apos;ll do</h2>
      <ol className="relative mt-6 space-y-8">
        {steps.map((step, index) => (
          <li key={`${step.title}-${index}`} className="relative flex gap-4">
            {index < steps.length - 1 && (
              <span
                className="absolute left-6 top-14 bottom-0 w-px -translate-x-1/2 bg-brand-border"
                aria-hidden
              />
            )}
            <div className="relative z-10 shrink-0 overflow-hidden rounded-xl">
              <ExperiencePhoto
                src={step.image_url}
                alt={step.title}
                className="h-24 w-24 sm:h-28 sm:w-28"
                sizes="112px"
              />
            </div>
            <div className="min-w-0 pt-1">
              <h3 className="font-semibold text-[var(--gm-ink)]">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-brand-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
