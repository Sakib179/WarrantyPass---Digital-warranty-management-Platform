'use client';

import { Breadcrumbs } from '@warrantypass/ui';
import { customerNavigation } from '@/components/customer/customer-navigation';
import { ManualVaultForm } from '@/components/customer/manual-vault-form';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function NewManualWarrantyPage() {
  return (
    <DashboardShell
      title="Add manual warranty"
      activeHref="/dashboard/manual-vault"
      items={customerNavigation}
    >
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manual Warranty Vault', href: '/dashboard/manual-vault' },
          { label: 'Add warranty', href: '/dashboard/manual-vault/new' },
        ]}
      />
      <ManualVaultForm />
    </DashboardShell>
  );
}
