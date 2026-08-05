'use client';

import { Breadcrumbs } from '@warrantypass/ui';
import { useParams } from 'next/navigation';
import { customerNavigation } from '@/components/customer/customer-navigation';
import { RecordDetail } from '@/components/customer/record-detail';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <DashboardShell
      title="Product details"
      activeHref="/dashboard/products"
      items={customerNavigation}
    >
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My products', href: '/dashboard/products' },
          { label: 'Product details', href: `/dashboard/products/${id}` },
        ]}
      />
      <RecordDetail mode="products" id={id} />
    </DashboardShell>
  );
}
