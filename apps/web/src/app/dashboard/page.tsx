'use client';

import type { CustomerDashboardDto } from '@warrantypass/shared';
import {
  Alert,
  Breadcrumbs,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
} from '@warrantypass/ui';
import { useQuery } from '@tanstack/react-query';
import { FolderClock, Package, ShieldCheck, WalletCards } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/components/auth/auth-provider';
import { customerNavigation } from '@/components/customer/customer-navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StatCard } from '@/components/dashboard/stat-card';
import { apiRequest } from '@/lib/api-client';

export default function CustomerDashboardPage() {
  const auth = useAuth();
  const query = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: () => apiRequest<CustomerDashboardDto>('/customer/dashboard'),
  });
  const firstName = auth.user?.profile.fullName?.split(' ')[0] ?? 'there';
  return (
    <DashboardShell title="Customer dashboard" activeHref="/dashboard" items={customerNavigation}>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Overview', href: '/dashboard' },
        ]}
      />
      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {firstName}</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            One secure view of every product and warranty you own.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 font-semibold text-white"
          href="/dashboard/manual-vault/new"
        >
          Add manual warranty
        </Link>
      </div>
      {query.isLoading ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        <div className="mt-6">
          <ErrorState
            title="Dashboard unavailable"
            description="We could not load your warranty summary."
            actionLabel="Try again"
            onAction={() => void query.refetch()}
          />
        </div>
      ) : query.data ? (
        <DashboardContent data={query.data} />
      ) : null}
    </DashboardShell>
  );
}

function DashboardContent({ data }: { data: CustomerDashboardDto }) {
  return (
    <>
      {data.profileCompletion < 100 ? (
        <Alert
          className="mt-6"
          tone="info"
          title={`Your profile is ${data.profileCompletion}% complete`}
        >
          Add your contact details so businesses can match future warranties to the correct account.
        </Alert>
      ) : null}
      <section
        aria-label="Warranty summary"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Products"
          value={String(data.counts.products)}
          detail="In your wallet"
          icon={<Package aria-hidden="true" />}
        />
        <StatCard
          label="Active warranties"
          value={String(data.counts.active)}
          detail={`${data.counts.verified} business verified`}
          icon={<ShieldCheck aria-hidden="true" />}
        />
        <StatCard
          label="Expiring soon"
          value={String(data.counts.expiringSoon)}
          detail="Within 30 days"
          icon={<FolderClock aria-hidden="true" />}
        />
        <StatCard
          label="All warranties"
          value={String(data.counts.warranties)}
          detail={`${data.counts.userUploaded} user uploaded`}
          icon={<WalletCards aria-hidden="true" />}
        />
      </section>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recently added products</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentProducts.length === 0 ? (
            <EmptyState
              title="Your wallet is ready"
              description="Business-issued warranties will appear automatically. An annual vault subscription lets you save paper warranties yourself."
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {data.recentProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <Link
                      className="font-semibold hover:text-[var(--primary)]"
                      href={`/dashboard/products/${product.id}`}
                    >
                      {product.productName}
                    </Link>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {product.brand?.name ?? 'Brand not specified'} ·{' '}
                      {product.maskedSerialNumber ?? 'No serial number'}
                    </p>
                  </div>
                  {product.warranty ? (
                    <StatusBadge
                      status={
                        product.warranty.verificationStatus === 'USER_UPLOADED'
                          ? 'USER_UPLOADED'
                          : 'VERIFIED'
                      }
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading dashboard">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}
