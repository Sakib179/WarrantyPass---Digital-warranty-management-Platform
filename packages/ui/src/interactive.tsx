'use client';

import { Search, X } from 'lucide-react';
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

import { Button } from './button.js';
import { Input } from './form-controls.js';
import { cn } from './lib/cn.js';

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export function Tabs({
  items,
  defaultValue,
  ariaLabel = 'Sections',
}: {
  items: TabItem[];
  defaultValue?: string;
  ariaLabel?: string;
}): ReactNode {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value ?? '');

  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1 overflow-x-auto border-b border-[var(--border)]"
      >
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active === item.value}
            aria-controls={`${item.value}-panel`}
            id={`${item.value}-tab`}
            onClick={() => setActive(item.value)}
            className={cn(
              'min-h-11 border-b-2 px-4 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
              active === item.value
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) =>
        active === item.value ? (
          <div
            key={item.value}
            role="tabpanel"
            id={`${item.value}-panel`}
            aria-labelledby={`${item.value}-tab`}
            className="py-5"
          >
            {item.content}
          </div>
        ) : null,
      )}
    </div>
  );
}

export interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: DialogProps): ReactNode {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="m-auto w-[min(92vw,34rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] shadow-2xl backdrop:bg-slate-950/50"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
        <div>
          <h2 id="dialog-title" className="text-lg font-bold">
            {title}
          </h2>
          {description ? (
            <p id="dialog-description" className="mt-1 text-sm text-[var(--text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
          <X aria-hidden="true" size={20} />
        </Button>
      </div>
      <div className="p-5">{children}</div>
      {footer ? (
        <div className="flex justify-end gap-3 border-t border-[var(--border)] p-5">{footer}</div>
      ) : null}
    </dialog>
  );
}

export function DropdownMenu({
  trigger,
  children,
  align = 'right',
}: {
  trigger: ReactElement;
  children: ReactNode;
  align?: 'left' | 'right';
}): ReactNode {
  const triggerWithAria = isValidElement(trigger)
    ? cloneElement(trigger, { 'aria-haspopup': 'menu' } as Record<string, string>)
    : trigger;

  return (
    <details className="group relative">
      <summary className="list-none [&::-webkit-details-marker]:hidden">{triggerWithAria}</summary>
      <div
        role="menu"
        className={cn(
          'absolute z-50 mt-2 min-w-52 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl',
          align === 'right' ? 'right-0' : 'left-0',
        )}
      >
        {Children.map(children, (child) => child)}
      </div>
    </details>
  );
}

export function DropdownItem({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>): ReactNode {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <Search
        aria-hidden="true"
        size={18}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--text-subtle)]"
      />
      <Input ref={ref} type="search" className={cn('pl-10', className)} {...props} />
    </div>
  ),
);
SearchInput.displayName = 'SearchInput';

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}): ReactNode {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
        Page <strong className="text-[var(--text)]">{page}</strong> of {Math.max(totalPages, 1)}
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
