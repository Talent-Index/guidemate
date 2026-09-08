import {
  BagIcon,
  CalendarIcon,
  LanguageIcon,
  PinIcon,
  UsersIcon,
  WalkIcon,
} from "@/components/experience/ExperienceInfoIcons";

export function ExperienceThingsToKnow({
  durationMinutes,
  location,
  languages,
}: {
  durationMinutes?: number | null;
  location: string | null;
  languages: string[];
}) {
  const items = [
    {
      title: "Guest requirements",
      body: "Guests ages 8 and up can attend. Minors must be accompanied by an adult.",
      icon: <UsersIcon />,
    },
    {
      title: "Activity level",
      body: "Moderate walking. Suitable for beginners. Pace is set by your guide.",
      icon: <WalkIcon />,
    },
    {
      title: "What to bring",
      body: "Comfortable shoes, water, sunscreen, and a phone with Guidemate installed for your trip PIN.",
      icon: <BagIcon />,
    },
    {
      title: "Languages",
      body: languages.length > 0 ? `Offered in ${languages.join(", ")}.` : "Offered in English.",
      icon: <LanguageIcon />,
    },
    {
      title: "Meeting point",
      body: location
        ? `We meet at ${location}. Your guide shares exact details after booking.`
        : "Your guide confirms the meeting point after booking.",
      icon: <PinIcon />,
    },
    {
      title: "Cancellation",
      body: "Cancel at least 24 hours before start for a full refund. Late cancellations may incur a fee.",
      icon: <CalendarIcon />,
    },
  ];

  return (
    <section>
      <h2 className="text-xl font-bold text-[var(--gm-ink)]">Things to know</h2>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="flex gap-3">
            {item.icon}
            <div>
              <h3 className="font-semibold text-[var(--gm-ink)]">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-brand-muted">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
      {durationMinutes != null && durationMinutes > 0 && (
        <p className="mt-4 text-xs text-brand-muted">Typical duration: about {durationMinutes} minutes.</p>
      )}
    </section>
  );
}
