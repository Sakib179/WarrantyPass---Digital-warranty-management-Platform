'use client';

import { Breadcrumbs } from '@warrantypass/ui';
import { Suspense } from 'react';
import { customerNavigation } from '@/components/customer/customer-navigation';
import { WalletList } from '@/components/customer/wallet-list';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function ProductsPage() {
  return (
    <DashboardShell title="My products" activeHref="/dashboard/products" items={customerNavigation}>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My products', href: '/dashboard/products' },
        ]}
      />
      <div className="mt-5">
        <h1 className="text-3xl font-bold">My products</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Review product details, provenance, and related warranty documents.
        </p>
      </div>
      <Suspense>
        <WalletList mode="products" />
      </Suspense>
    </DashboardShell>
  );
}
