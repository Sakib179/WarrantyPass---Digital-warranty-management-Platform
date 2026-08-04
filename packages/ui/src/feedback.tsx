import { AlertTriangle, FileQuestion, Inbox } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { Button } from './button.js';
import { cn } from './lib/cn.js';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-[var(--surface-emphasis)]', className)}
      {...props}
    />
  );
}

export interface StateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

function StatePanel({ title, description, actionLabel, onAction, icon }: StateProps): ReactNode {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
        {icon}
      </div>
      <h3 className="font-bold text-[var(--text)]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState(props: StateProps): ReactNode {
  return <StatePanel icon={props.icon ?? <Inbox aria-hidden="true" />} {...props} />;
}

export function ErrorState(props: StateProps): ReactNode {
  return <StatePanel icon={props.icon ?? <AlertTriangle aria-hidden="true" />} {...props} />;
}

export function NotFoundState(props: Omit<StateProps, 'icon'>): ReactNode {
  return <StatePanel icon={<FileQuestion aria-hidden="true" />} {...props} />;
}
