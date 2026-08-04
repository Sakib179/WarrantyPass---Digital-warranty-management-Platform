import { statusLabels, type DisplayStatus } from '@warrantypass/shared';
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './lib/cn.js';

const badgeVariants = cva(
  'inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      tone: {
        neutral: 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]',
        primary:
          'border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary-strong)]',
        success:
          'border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-text)]',
        warning:
          'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)]',
        danger: 'border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-text)]',
        info: 'border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--info-text)]',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ tone, className, ...props }: BadgeProps): ReactNode {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const statusTone: Record<DisplayStatus, NonNullable<BadgeProps['tone']>> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  IN_REVIEW: 'info',
  MORE_INFORMATION_REQUIRED: 'warning',
  VERIFIED: 'success',
  USER_UPLOADED: 'info',
  EXPIRED: 'neutral',
  INVALID: 'danger',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  DEACTIVATED: 'neutral',
  DRAFT: 'neutral',
  INVITED: 'info',
  REMOVED: 'neutral',
  REVOKED: 'danger',
  COMPLETED: 'primary',
};

export function StatusBadge({ status }: { status: DisplayStatus }): ReactNode {
  return (
    <Badge tone={statusTone[status]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {statusLabels[status]}
    </Badge>
  );
}
