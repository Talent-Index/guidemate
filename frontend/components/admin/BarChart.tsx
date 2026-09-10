export interface BarSeries {
  label: string;
  value: number;
  color: string;
}

export function BarChart({
  title,
  subtitle,
  series,
  valuePrefix = "",
}: {
  title: string;
  subtitle?: string;
  series: BarSeries[];
  valuePrefix?: string;
}) {
  const max = Math.max(...series.map((item) => item.value), 1);

  return (
    <div>
      <h3 className="text-sm font-bold text-brand-blueDark">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-brand-muted">{subtitle}</p>}
      <div className="mt-5 space-y-4">
        {series.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-brand-muted">{item.label}</span>
              <span className="font-semibold text-brand-blueDark">
                {valuePrefix}
                {item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-brand-border/60">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
