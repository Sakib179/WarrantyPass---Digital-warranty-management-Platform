'use client';

import { use, useEffect, useState } from 'react';
import { Card, Badge } from '@warrantypass/ui';
import { apiRequest } from '../../../../lib/api-client.js';

interface CustomerRepairDetail {
  id: string;
  repairNumber: string;
  reportedProblem: string;
  diagnosis: string | null;
  workPerformed: string | null;
  partsReplaced: string | null;
  warrantyCoverageStatus: string;
  laborCostCents: number;
  partsCostCents: number;
  totalCostCents: number;
  receivedAt: string | null;
  repairStartedAt: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  currentStatus: string;
  customerVisibleNote: string | null;
  updatedAt: string;
  serviceCenter: {
    name: string;
    phone: string;
    addressLine: string;
    area: string;
    district: string;
    openingHours: string;
  };
  customerProduct: {
    productName: string;
    modelNumber: string | null;
    serialNumber: string | null;
  };
  business: {
    name: string;
  };
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    customerVisibleNote: string | null;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
}

export default function CustomerRepairDetailPage({
  params,
}: {
  params: Promise<{ repairId: string }>;
}) {
  const { repairId } = use(params);

  const [repair, setRepair] = useState<CustomerRepairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRepair() {
      try {
        const data = await apiRequest<CustomerRepairDetail>(`/customer/repairs/${repairId}`);
        setRepair(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load repair details');
      } finally {
        setLoading(false);
      }
    }
    loadRepair();
  }, [repairId]);

  if (loading) return <div className="py-12 text-center text-slate-500">Loading repair timeline...</div>;
  if (error || !repair) return <div className="py-12 text-center text-red-500">{error || 'Repair record not found'}</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
              {repair.repairNumber}
            </h1>
            <Badge tone="info">{repair.currentStatus.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Product: <span className="font-semibold text-slate-900 dark:text-white">{repair.customerProduct.productName}</span> &bull; {repair.business.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Technical & Costs */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
              Reported Problem & Technical Diagnosis
            </h2>
            <div>
              <span className="text-xs text-slate-500 block">Reported Problem</span>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">{repair.reportedProblem}</p>
            </div>
            {repair.diagnosis && (
              <div>
                <span className="text-xs text-slate-500 block">Technician Diagnosis</span>
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">{repair.diagnosis}</p>
              </div>
            )}
            {repair.workPerformed && (
              <div>
                <span className="text-xs text-slate-500 block">Work Performed</span>
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">{repair.workPerformed}</p>
              </div>
            )}
            {repair.partsReplaced && (
              <div>
                <span className="text-xs text-slate-500 block">Parts Replaced</span>
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 font-mono">{repair.partsReplaced}</p>
              </div>
            )}
          </Card>

          {/* Cost Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800 mb-4">
              Cost Breakdown (BDT)
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Labor Charge</span>
                <span>৳{(repair.laborCostCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parts Replacement Charge</span>
                <span>৳{(repair.partsCostCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-slate-900 dark:text-white">
                <span>Total Charge</span>
                <span>৳{(repair.totalCostCents / 100).toFixed(2)}</span>
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
                <span>Warranty Coverage Status</span>
                <Badge tone={repair.warrantyCoverageStatus === 'FULLY_COVERED' ? 'success' : 'neutral'}>
                  {repair.warrantyCoverageStatus.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Timeline & Center */}
        <div className="space-y-6">
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
              Service Center Location
            </h3>
            <div>
              <span className="text-xs text-slate-500 block">Center Name</span>
              <span className="text-sm font-semibold">{repair.serviceCenter.name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Address</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {repair.serviceCenter.addressLine}, {repair.serviceCenter.area}, {repair.serviceCenter.district}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Contact Phone</span>
              <span className="text-sm font-medium">{repair.serviceCenter.phone}</span>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 border-b pb-2 dark:border-slate-800">
              Repair Progress Timeline
            </h3>
            <div className="space-y-3 text-xs">
              {repair.statusHistory.map((h) => (
                <div key={h.id} className="border-l-2 border-slate-300 pl-3 dark:border-slate-700">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {h.toStatus.replace(/_/g, ' ')}
                  </div>
                  <div className="text-slate-500">{new Date(h.createdAt).toLocaleString()}</div>
                  {h.customerVisibleNote && <div className="mt-1 text-slate-600 dark:text-slate-400">{h.customerVisibleNote}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
