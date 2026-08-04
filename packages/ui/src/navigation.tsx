'use client';

import { Bell, ChevronDown, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from './button.js';
import { DropdownItem, DropdownMenu } from './interactive.js';
import { cn } from './lib/cn.js';

export interface NavigationItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

export function Breadcrumbs({ items }: { items: NavigationItem[] }): ReactNode {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            <a
              href={item.href}
              aria-current={index === items.length - 1 ? 'page' : undefined}
              className="hover:text-[var(--text)]"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DashboardSidebar({
  brand,
  items,
  activeHref,
  footer,
}: {
  brand: ReactNode;
  items: NavigationItem[];
  activeHref: string;
  footer?: ReactNode;
}): ReactNode {
  return (
    <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
      <div className="flex h-18 items-center border-b border-[var(--border)] px-5">{brand}</div>
      <nav aria-label="Dashboard" className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.href === activeHref ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
              item.href === activeHref
                ? 'bg-[var(--primary-soft)] text-[var(--primary-strong)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]',
            )}
          >
            {item.icon}
            {item.label}
          </a>
        ))}
      </nav>
      {footer ? <div className="border-t border-[var(--border)] p-4">{footer}</div> : null}
    </aside>
  );
}

export function UserMenu({
  name,
  email,
  accountLabel = 'Customer account',
  onAccountSettings,
  onSignOut,
}: {
  name: string;
  email: string;
  accountLabel?: string;
  onAccountSettings?: () => void;
  onSignOut?: () => void;
}): ReactNode {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (
    <DropdownMenu
      trigger={
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 rounded-xl p-1.5 text-left hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none"
          aria-label="Open user menu"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-[var(--primary)] text-xs font-bold text-white">
            {initials}
          </span>
          <span className="hidden max-w-36 sm:block">
            <span className="block truncate text-sm font-semibold text-[var(--text)]">{name}</span>
            <span className="block truncate text-xs text-[var(--text-muted)]">{accountLabel}</span>
          </span>
          <ChevronDown aria-hidden="true" size={16} className="text-[var(--text-subtle)]" />
        </button>
      }
    >
      <div className="border-b border-[var(--border)] px-3 py-2">
        <p className="text-xs text-[var(--text-subtle)]">Signed in as</p>
        <p className="truncate text-sm font-medium text-[var(--text)]">{email}</p>
      </div>
      <DropdownItem onClick={onAccountSettings}>Account settings</DropdownItem>
      <DropdownItem>Help and support</DropdownItem>
      <DropdownItem onClick={onSignOut} className="text-[var(--danger)]">
        Sign out
      </DropdownItem>
    </DropdownMenu>
  );
}

export function DashboardHeader({
  title,
  mobileNavigation,
  userMenu,
}: {
  title: string;
  mobileNavigation?: ReactNode;
  userMenu: ReactNode;
}): ReactNode {
  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {mobileNavigation}
        <h1 className="truncate text-base font-bold text-[var(--text)] sm:text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell aria-hidden="true" size={19} />
        </Button>
        {userMenu}
      </div>
    </header>
  );
}

export function MobileNavigation({
  brand,
  items,
  activeHref,
}: {
  brand: ReactNode;
  items: NavigationItem[];
  activeHref: string;
}): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <Menu aria-hidden="true" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative flex h-full w-[min(86vw,20rem)] flex-col bg-[var(--surface)] shadow-2xl">
            <div className="flex h-18 items-center justify-between border-b border-[var(--border)] px-5">
              {brand}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <nav aria-label="Mobile dashboard" className="space-y-1 p-3">
              {items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={item.href === activeHref ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium',
                    item.href === activeHref
                      ? 'bg-[var(--primary-soft)] text-[var(--primary-strong)]'
                      : 'text-[var(--text-muted)]',
                  )}
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
