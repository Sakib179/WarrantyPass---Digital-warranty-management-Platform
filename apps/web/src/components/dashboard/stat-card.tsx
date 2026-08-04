import { Card, CardContent } from '@warrantypass/ui';
import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}): ReactNode {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-5 sm:pt-6">
        <div>
          <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">{value}</p>
          <p className="mt-1 text-xs text-[var(--text-subtle)]">{detail}</p>
        </div>
        <span className="grid size-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}
