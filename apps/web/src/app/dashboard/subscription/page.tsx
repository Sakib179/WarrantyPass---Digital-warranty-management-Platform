'use client';

import { Breadcrumbs } from '@warrantypass/ui';
import { customerNavigation } from '@/components/customer/customer-navigation';
import { SubscriptionPanel } from '@/components/customer/subscription-panel';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function SubscriptionPage() {
  return (
    <DashboardShell
      title="Subscription"
      activeHref="/dashboard/subscription"
      items={customerNavigation}
    >
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Subscription', href: '/dashboard/subscription' },
        ]}
      />
      <div className="mt-5">
        <h1 className="text-3xl font-bold">Manual Vault subscription</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Manage annual access, renewal status, and payment history in BDT.
        </p>
      </div>
      <SubscriptionPanel />
    </DashboardShell>
  );
}
