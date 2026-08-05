'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Badge } from '@warrantypass/ui';
import { apiRequest } from '../../../lib/api-client.js';

interface CustomerRepairListItem {
  id: string;
  repairNumber: string;
  productName: string;
  businessName: string;
  serviceCenterName: string;
  currentStatus: string;
  warrantyCoverageStatus: string;
  receivedAt: string | null;
  updatedAt: string;
  totalCostCents: number;
}

export default function CustomerRepairsPage() {
  const [repairs, setRepairs] = useState<CustomerRepairListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepairs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<CustomerRepairListItem[]>('/customer/repairs');
      setRepairs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load repair history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRODUCT_RECEIVED':
      case 'DIAGNOSIS_IN_PROGRESS':
        return <Badge tone="info">{status.replace(/_/g, ' ')}</Badge>;
      case 'REPAIR_IN_PROGRESS':
      case 'QUALITY_CHECK':
        return <Badge tone="warning">{status.replace(/_/g, ' ')}</Badge>;
      case 'READY_FOR_COLLECTION':
      case 'DELIVERED':
      case 'COMPLETED':
        return <Badge tone="success">{status.replace(/_/g, ' ')}</Badge>;
      case 'CANCELLED':
      case 'UNREPAIRABLE':
        return <Badge tone="danger">{status.replace(/_/g, ' ')}</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Servicing & Repair History</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Track real-time repair progress, diagnostics, parts replaced, and servicing timelines across authorized centers.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading your repair history...</div>
      ) : repairs.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          No repair records found for your registered products.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repairs.map((r) => (
            <Card key={r.id} className="flex flex-col justify-between p-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-500">{r.repairNumber}</span>
                  {getStatusBadge(r.currentStatus)}
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{r.productName}</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Center: {r.serviceCenterName} ({r.businessName})
                </p>
                <div className="mt-3">
                  <span className="text-xs text-slate-500">Coverage: </span>
                  <Badge tone={r.warrantyCoverageStatus === 'FULLY_COVERED' ? 'success' : 'neutral'}>
                    {r.warrantyCoverageStatus.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t pt-4 border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Updated {new Date(r.updatedAt).toLocaleDateString()}</span>
                <Link href={`/dashboard/repairs/${r.id}`}>
                  <Button variant="secondary" size="sm">
                    View Progress
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
