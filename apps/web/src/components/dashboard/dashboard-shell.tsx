'use client';

import {
  DashboardHeader,
  DashboardSidebar,
  MobileNavigation,
  UserMenu,
  type NavigationItem,
} from '@warrantypass/ui';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { Brand } from '@/components/brand';
import { useAuth } from '@/components/auth/auth-provider';

export function DashboardShell({
  title,
  activeHref,
  items,
  account,
  children,
}: {
  title: string;
  activeHref: string;
  items: NavigationItem[];
  account?: {
    name: string;
    email: string;
    label: string;
  };
  children: ReactNode;
}): ReactNode {
  const auth = useAuth();
  const router = useRouter();
  const resolvedAccount = account ?? {
    name: auth.user?.profile.fullName ?? 'WarrantyPass user',
    email: auth.user?.email ?? '',
    label: 'WarrantyPass account',
  };
  const brand = <Brand href="/" />;
  const userMenu = (
    <UserMenu
      name={resolvedAccount.name}
      email={resolvedAccount.email}
      accountLabel={resolvedAccount.label}
      onAccountSettings={() => router.push('/account/profile')}
      onSignOut={() => void auth.logout()}
    />
  );

  return (
    <div className="flex min-h-dvh bg-[var(--background)]">
      <DashboardSidebar
        brand={brand}
        items={items}
        activeHref={activeHref}
        footer={
          <p className="text-xs leading-5 text-[var(--text-subtle)]">
            Secure workspace
            <br />
            Session protected
          </p>
        }
      />
      <div className="min-w-0 flex-1">
        <DashboardHeader
          title={title}
          mobileNavigation={
            <MobileNavigation brand={brand} items={items} activeHref={activeHref} />
          }
          userMenu={userMenu}
        />
        <main id="main-content" className="mx-auto max-w-[96rem] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
