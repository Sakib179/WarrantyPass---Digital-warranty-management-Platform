'use client';

import { Breadcrumbs } from '@warrantypass/ui';
import { useParams } from 'next/navigation';
import { customerNavigation } from '@/components/customer/customer-navigation';
import { ManualVaultForm } from '@/components/customer/manual-vault-form';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function EditManualWarrantyPage() {
  const { productId } = useParams<{ productId: string }>();
  return (
    <DashboardShell
      title="Edit manual warranty"
      activeHref="/dashboard/manual-vault"
      items={customerNavigation}
    >
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manual Warranty Vault', href: '/dashboard/manual-vault' },
          { label: 'Edit warranty', href: `/dashboard/manual-vault/${productId}/edit` },
        ]}
      />
      <ManualVaultForm productId={productId} />
    </DashboardShell>
  );
}
