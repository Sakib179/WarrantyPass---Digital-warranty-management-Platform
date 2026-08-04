'use client';

import { Eye, EyeOff } from 'lucide-react';
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { Button } from './button.js';
import { cn } from './lib/cn.js';

const controlClass =
  'min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-sm text-[var(--text)] shadow-xs outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)] focus:ring-3 focus:ring-[var(--focus-soft)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-subtle)]';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(controlClass, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pr-12', className)}
          {...props}
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 min-h-11 rounded-l-none"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </Button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(controlClass, 'appearance-none', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(controlClass, 'py-3', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export interface FormFieldProps {
  label: string;
  htmlFor?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean;
  children: ReactNode;
  className?: string | undefined;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: FormFieldProps): ReactNode {
  const generatedId = useId();
  const controlId = htmlFor ?? generatedId;
  const messageId = `${controlId}-message`;

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={controlId} className="block text-sm font-semibold text-[var(--text)]">
        {label}
        {required ? (
          <>
            <span className="text-[var(--danger)]" aria-hidden="true">
              {' '}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
