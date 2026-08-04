import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './lib/cn.js';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('space-y-1.5 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>): ReactNode {
  return <h3 className={cn('text-lg font-bold text-[var(--text)]', className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>): ReactNode {
  return <p className={cn('text-sm leading-6 text-[var(--text-muted)]', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-t border-[var(--border)] p-5 sm:p-6',
        className,
      )}
      {...props}
    />
  );
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger';
}

const alertTone = {
  info: 'border-[var(--info-border)] bg-[var(--info-soft)]',
  success: 'border-[var(--success-border)] bg-[var(--success-soft)]',
  warning: 'border-[var(--warning-border)] bg-[var(--warning-soft)]',
  danger: 'border-[var(--danger-border)] bg-[var(--danger-soft)]',
};

export function Alert({
  title,
  icon,
  tone = 'info',
  children,
  className,
  ...props
}: AlertProps): ReactNode {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl border p-4', alertTone[tone], className)}
      {...props}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div>
        <p className="font-semibold text-[var(--text)]">{title}</p>
        <div className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{children}</div>
      </div>
    </div>
  );
}
