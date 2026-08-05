'use client';

import { use, useEffect, useState } from 'react';
import type { BusinessSubscriptionEntitlementDto } from '@warrantypass/shared';
import { Card, Badge } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function BusinessSubscriptionPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [entitlement, setEntitlement] = useState<BusinessSubscriptionEntitlementDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const data = await apiRequest<BusinessSubscriptionEntitlementDto>('/business/subscription');
        setEntitlement(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load subscription entitlement details');
      } finally {
        setLoading(false);
      }
    }
    loadSubscription();
  }, [businessId]);

  if (loading) return <div className="py-12 text-center text-slate-500">Loading subscription details...</div>;
  if (error || !entitlement) return <div className="py-12 text-center text-red-500">{error || 'No subscription found'}</div>;

  const usagePercent = Math.round((entitlement.issuedWarrantiesThisMonth / entitlement.maxWarrantiesPerMonth) * 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Business Subscription & Quotas</h1>
          <Badge tone="success">{entitlement.planName}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Billing Period: {new Date(entitlement.currentPeriodStart).toLocaleDateString()} &mdash; {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-500">Monthly Warranty Issuances</h3>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {entitlement.issuedWarrantiesThisMonth} / {entitlement.maxWarrantiesPerMonth}
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-2 rounded-full ${usagePercent >= 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, usagePercent)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {entitlement.remainingWarrantiesThisMonth} issuances remaining this billing cycle.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-500">Team Seats</h3>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {entitlement.currentEmployees} / {entitlement.maxEmployees}
          </div>
          <p className="mt-4 text-xs text-slate-500">Active staff members in your business workspace.</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-500">Warranty Templates</h3>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {entitlement.currentTemplates} / {entitlement.maxTemplates}
          </div>
          <p className="mt-4 text-xs text-slate-500">Active reusable templates created.</p>
        </Card>
      </div>
    </div>
  );
}
