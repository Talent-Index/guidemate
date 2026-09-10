export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  title,
  subtitle,
  segments,
  size = 168,
}: {
  title: string;
  subtitle?: string;
  segments: DonutSegment[];
  size?: number;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 38;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div>
      <h3 className="text-sm font-bold text-brand-blueDark">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-brand-muted">{subtitle}</p>}
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#E3E8EF" strokeWidth={stroke} />
            {total > 0 &&
              segments.map((segment) => {
                const fraction = segment.value / total;
                const dash = fraction * circumference;
                const circle = (
                  <circle
                    key={segment.label}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += dash;
                return circle;
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-brand-blueDark">{total.toLocaleString()}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">Total</span>
          </div>
        </div>
        <ul className="flex w-full flex-col gap-2 text-sm">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-brand-muted">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
              <span className="font-semibold text-brand-blueDark">{segment.value.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
