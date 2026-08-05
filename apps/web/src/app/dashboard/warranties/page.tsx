'use client';

import { Breadcrumbs } from '@warrantypass/ui';
import { Suspense } from 'react';
import { customerNavigation } from '@/components/customer/customer-navigation';
import { WalletList } from '@/components/customer/wallet-list';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function WarrantiesPage() {
  return (
    <DashboardShell
      title="Warranty wallet"
      activeHref="/dashboard/warranties"
      items={customerNavigation}
    >
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Warranty wallet', href: '/dashboard/warranties' },
        ]}
      />
      <div className="mt-5">
        <h1 className="text-3xl font-bold">Digital Warranty Wallet</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Business-verified and personal records stay clearly distinguished. A saved record does not
          prove product authenticity.
        </p>
      </div>
      <Suspense>
        <WalletList mode="warranties" />
      </Suspense>
    </DashboardShell>
  );
}
