'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { RepairRecordDto } from '@warrantypass/shared';
import { Button, Card, Select, Badge } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function BusinessRepairsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [repairs, setRepairs] = useState<RepairRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');

  const fetchRepairs = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const data = await apiRequest<RepairRecordDto[]>(`/business/repairs?${query.toString()}`);
      setRepairs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load repair matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, [businessId, statusFilter]);

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Repair & Servicing Management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track active product repair jobs, update diagnostic details, manage labor/parts costs, and update repair status.
          </p>
        </div>
      </div>

      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sm:max-w-xs"
          >
            <option value="">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="PRODUCT_RECEIVED">Product Received</option>
            <option value="DIAGNOSIS_IN_PROGRESS">Diagnosis in Progress</option>
            <option value="WAITING_FOR_PARTS">Waiting for Parts</option>
            <option value="REPAIR_IN_PROGRESS">Repair in Progress</option>
            <option value="QUALITY_CHECK">Quality Check</option>
            <option value="READY_FOR_COLLECTION">Ready for Collection</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
            <option value="UNREPAIRABLE">Unrepairable</option>
          </Select>
        </div>
      </Card>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading repair records...</div>
      ) : repairs.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          No repair records match the selected status filter.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3">Repair #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Product</th>
                <th className="p-3">Service Center</th>
                <th className="p-3">Status</th>
                <th className="p-3">Total Cost</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {repairs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">
                    {r.repairNumber}
                  </td>
                  <td className="p-3 font-medium">{r.customerName || 'N/A'}</td>
                  <td className="p-3">{r.productName}</td>
                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400">{r.serviceCenterName}</td>
                  <td className="p-3">{getStatusBadge(r.currentStatus)}</td>
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    ৳{(r.totalCostCents / 100).toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/business/${businessId}/repairs/${r.id}`}>
                      <Button variant="secondary" size="sm">
                        Manage Repair
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
