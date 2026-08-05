'use client';

import { Breadcrumbs } from '@warrantypass/ui';
import { customerNavigation } from '@/components/customer/customer-navigation';
import { ManualVaultOverview } from '@/components/customer/manual-vault-overview';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function ManualVaultPage() {
  return (
    <DashboardShell
      title="Manual Warranty Vault"
      activeHref="/dashboard/manual-vault"
      items={customerNavigation}
    >
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manual Warranty Vault', href: '/dashboard/manual-vault' },
        ]}
      />
      <div className="mt-5">
        <h1 className="text-3xl font-bold">Manual Warranty Vault</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Private, customer-entered records for businesses not connected to WarrantyPass.
        </p>
      </div>
      <ManualVaultOverview />
    </DashboardShell>
  );
}
