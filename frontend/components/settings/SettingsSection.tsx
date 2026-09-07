import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">{title}</h2>
      {description && <p className="mt-1 text-sm text-brand-muted">{description}</p>}
      <Card className="mt-3">{children}</Card>
    </section>
  );
}
