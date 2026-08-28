type ChipTone = "locked" | "released" | "paid" | "neutral" | "error";

const toneClasses: Record<ChipTone, string> = {
  locked: "bg-brand-accent/10 text-brand-accent",
  released: "bg-brand-amber/20 text-brand-blueDark",
  paid: "bg-brand-successBg text-brand-success",
  neutral: "bg-brand-bg text-brand-muted",
  error: "bg-red-50 text-red-600",
};

const toneLabel: Record<ChipTone, string> = {
  locked: "Locked",
  released: "Released",
  paid: "Paid",
  neutral: "-",
  error: "Error",
};

export function Chip({ tone, label }: { tone: ChipTone; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {label ?? toneLabel[tone]}
    </span>
  );
}
