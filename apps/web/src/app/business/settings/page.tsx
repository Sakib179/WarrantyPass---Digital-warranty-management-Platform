'use client';

import { Alert, Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@warrantypass/ui';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { businessNavigation } from '@/components/business/business-navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function BusinessSettingsPage(): ReactNode {
  const auth = useAuth();
  const business = auth.user?.businesses.find((item) => item.isCurrent) ?? auth.user?.businesses[0];
  return (
    <ProtectedRoute context="business">
      <DashboardShell
        title="Business settings"
        activeHref="/business/settings"
        items={businessNavigation}
      >
        <h1 className="text-3xl font-bold tracking-tight">Business workspace settings</h1>
        <Alert className="mt-6" title="Current business context">
          Every team and verification request includes the selected business identifier and is
          re-authorized by the API.
        </Alert>
        <Card className="mt-6 max-w-2xl">
          <CardHeader>
            <CardTitle>{business?.name ?? 'Business workspace'}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">{business?.roles.join(', ')}</span>
            {business ? <StatusBadge status={business.status} /> : null}
          </CardContent>
        </Card>
      </DashboardShell>
    </ProtectedRoute>
  );
}
