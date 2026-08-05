'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { ServiceCenterDto } from '@warrantypass/shared';
import { Button, Card, Badge } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function BusinessServiceCentersPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [centers, setCenters] = useState<ServiceCenterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceCenters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ServiceCenterDto[]>('/business/service-centers');
      setCenters(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load service centers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceCenters();
  }, [businessId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Authorized Service Centers</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your brand&apos;s verified repair centers, opening hours, supported products, and staff assignments.
          </p>
        </div>
        <Link href={`/business/${businessId}/service-centers/new`}>
          <Button variant="primary">+ Create Service Center</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading service centers...</div>
      ) : centers.length === 0 ? (
        <Card className="py-12 text-center p-6 text-slate-500">
          <p className="mb-4">No authorized service centers created yet.</p>
          <Link href={`/business/${businessId}/service-centers/new`}>
            <Button variant="primary">Add First Service Center</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {centers.map((c) => (
            <Card key={c.id} className="flex flex-col justify-between p-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {c.serviceCenterCode}
                  </span>
                  <Badge tone={c.status === 'ACTIVE' ? 'success' : 'neutral'}>{c.status}</Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{c.name}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div>📍 {c.addressLine}, {c.area}, {c.district}</div>
                  <div>📞 {c.phone}</div>
                  <div>⏰ {c.openingHours}</div>
                </div>
              </div>

              <div className="mt-6 border-t pt-4 border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center text-slate-500">
                <span>{c.memberCount ?? 0} Staff assigned</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
