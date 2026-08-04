'use client';

import { buttonVariants, cn } from '@warrantypass/ui';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { Brand } from './brand';

const navigation = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#for-business', label: 'For business' },
  { href: '#plans', label: 'Plans' },
  { href: '#security', label: 'Security' },
];

export function SiteHeader(): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/business/login"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            Business sign in
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>
            Sign in
          </Link>
          <Link href="/register" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }))}>
            Create free account
          </Link>
        </div>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:hidden"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {open ? (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-[var(--border)] bg-[var(--surface)] p-4 sm:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 border-t border-[var(--border)]" />
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: 'secondary', fullWidth: true }))}
            >
              Customer sign in
            </Link>
            <Link
              href="/register"
              className={cn(buttonVariants({ variant: 'primary', fullWidth: true }))}
            >
              Create free account
            </Link>
            <Link
              href="/business/login"
              className={cn(buttonVariants({ variant: 'ghost', fullWidth: true }))}
            >
              Business sign in
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
