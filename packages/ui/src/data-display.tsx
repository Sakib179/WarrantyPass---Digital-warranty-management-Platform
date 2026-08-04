import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

import { cn } from './lib/cn.js';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>): ReactNode {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactNode {
  return <thead className={cn('bg-[var(--surface-muted)]', className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactNode {
  return <tbody className={cn('divide-y divide-[var(--border)]', className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>): ReactNode {
  return (
    <tr
      className={cn('transition-colors hover:bg-[var(--surface-subtle)]', className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>): ReactNode {
  return (
    <th
      className={cn(
        'h-11 px-4 text-xs font-semibold tracking-wide whitespace-nowrap text-[var(--text-muted)] uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>): ReactNode {
  return <td className={cn('px-4 py-3.5 text-[var(--text)]', className)} {...props} />;
}
