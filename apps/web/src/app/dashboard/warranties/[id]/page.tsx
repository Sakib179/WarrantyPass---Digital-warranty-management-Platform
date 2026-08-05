'use client';

import { Breadcrumbs } from '@warrantypass/ui';
import { useParams } from 'next/navigation';
import { customerNavigation } from '@/components/customer/customer-navigation';
import { RecordDetail } from '@/components/customer/record-detail';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function WarrantyDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <DashboardShell
      title="Warranty details"
      activeHref="/dashboard/warranties"
      items={customerNavigation}
    >
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Warranty wallet', href: '/dashboard/warranties' },
          { label: 'Warranty details', href: `/dashboard/warranties/${id}` },
        ]}
      />
      <RecordDetail mode="warranties" id={id} />
    </DashboardShell>
  );
}
