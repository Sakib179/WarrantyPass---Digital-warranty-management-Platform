import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function Brand({
  compact = false,
  href = '/',
}: {
  compact?: boolean;
  href?: string;
}): ReactNode {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg font-bold tracking-tight text-[var(--text)]"
      aria-label="WarrantyPass home"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-white shadow-sm">
        <ShieldCheck aria-hidden="true" size={21} strokeWidth={2.3} />
      </span>
      {compact ? null : (
        <span className="text-lg">
          Warranty<span className="text-[var(--primary)]">Pass</span>
        </span>
      )}
    </Link>
  );
}
