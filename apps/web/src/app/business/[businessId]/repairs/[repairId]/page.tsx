'use client';

import { use, useEffect, useState } from 'react';
import type { RepairRecordDto } from '@warrantypass/shared';
import { Button, Card, Badge, Dialog, Input, Select } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../../lib/api-client.js';

export default function BusinessRepairDetailPage({
  params,
}: {
  params: Promise<{ businessId: string; repairId: string }>;
}) {
  const { businessId, repairId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [repair, setRepair] = useState<RepairRecordDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Status form
  const [statusForm, setStatusForm] = useState({
    status: 'PRODUCT_RECEIVED',
    customerVisibleNote: '',
    internalNote: '',
  });

  // Details form
  const [detailsForm, setDetailsForm] = useState({
    diagnosis: '',
    workPerformed: '',
    partsReplaced: '',
    warrantyCoverageStatus: 'PENDING_DECISION',
    laborCostCents: 0,
    partsCostCents: 0,
    customerVisibleNote: '',
    internalNote: '',
  });

  const fetchRepair = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<RepairRecordDto>(`/business/repairs/${repairId}`);
      setRepair(data);
      setStatusForm((prev) => ({ ...prev, status: data.currentStatus }));
      setDetailsForm({
        diagnosis: data.diagnosis || '',
        workPerformed: data.workPerformed || '',
        partsReplaced: data.partsReplaced || '',
        warrantyCoverageStatus: data.warrantyCoverageStatus,
        laborCostCents: data.laborCostCents,
        partsCostCents: data.partsCostCents,
        customerVisibleNote: data.customerVisibleNote || '',
        internalNote: data.internalNote || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repair details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepair();
  }, [businessId, repairId]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/business/repairs/${repairId}/status`, {
        method: 'POST',
        body: JSON.stringify(statusForm),
      });
      setIsStatusModalOpen(false);
      fetchRepair();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/business/repairs/${repairId}`, {
        method: 'PATCH',
        body: JSON.stringify(detailsForm),
      });
      setIsDetailsModalOpen(false);
      fetchRepair();
    } catch (err: any) {
      alert(err.message || 'Failed to update repair details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Loading repair details...</div>;
  if (error || !repair) return <div className="py-12 text-center text-red-500">{error || 'Repair record not found'}</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
              {repair.repairNumber}
            </h1>
            <Badge tone="info">{repair.currentStatus.replace(/_/g, ' ')}</Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setIsDetailsModalOpen(true)}>
            Edit Technical Details & Costs
          </Button>
          <Button variant="primary" onClick={() => setIsStatusModalOpen(true)}>
            Update Repair Status
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
              Technical Diagnosis & Work Performed
            </h2>
            <div>
              <span className="text-xs text-slate-500 block">Reported Issue</span>
              <p className="text-sm font-medium mt-1">{repair.reportedProblem}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Diagnosis Notes</span>
              <p className="text-sm mt-1">{repair.diagnosis || 'Pending diagnosis...'}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Work Performed</span>
              <p className="text-sm mt-1">{repair.workPerformed || 'N/A'}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Parts Replaced</span>
              <p className="text-sm font-mono mt-1">{repair.partsReplaced || 'None'}</p>
            </div>
          </Card>

          {/* Internal Notes Card */}
          {repair.internalNote && (
            <Card className="p-6 bg-slate-900 text-white dark:bg-slate-950">
              <span className="text-xs font-semibold text-amber-400 block mb-1">🔒 Private Internal Note (Staff Only)</span>
              <p className="text-sm text-slate-200">{repair.internalNote}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
              Financial & Coverage Breakdown
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Labor Charge</span>
                <span>৳{(repair.laborCostCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Parts Charge</span>
                <span>৳{(repair.partsCostCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-slate-900 dark:text-white">
                <span>Total Charge</span>
                <span>৳{(repair.totalCostCents / 100).toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">Coverage</span>
                <Badge tone={repair.warrantyCoverageStatus === 'FULLY_COVERED' ? 'success' : 'neutral'}>
                  {repair.warrantyCoverageStatus.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 border-b pb-2 dark:border-slate-800">
              Status History
            </h3>
            <div className="space-y-3 text-xs">
              {repair.statusHistory?.map((h) => (
                <div key={h.id} className="border-l-2 border-slate-300 pl-3 dark:border-slate-700">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {h.toStatus.replace(/_/g, ' ')}
                  </div>
                  <div className="text-slate-500">{new Date(h.createdAt).toLocaleString()}</div>
                  {h.customerVisibleNote && <div className="mt-1 text-slate-600 dark:text-slate-400">{h.customerVisibleNote}</div>}
                  {h.internalNote && <div className="mt-1 text-amber-500 italic">🔒 {h.internalNote}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Update Repair Status">
        <form onSubmit={handleUpdateStatus} className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">New Status *</label>
            <Select
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
            >
              <option value="CREATED">Created</option>
              <option value="PRODUCT_RECEIVED">Product Received</option>
              <option value="DIAGNOSIS_IN_PROGRESS">Diagnosis In Progress</option>
              <option value="WAITING_FOR_PARTS">Waiting For Parts</option>
              <option value="REPAIR_IN_PROGRESS">Repair In Progress</option>
              <option value="QUALITY_CHECK">Quality Check</option>
              <option value="READY_FOR_COLLECTION">Ready For Collection</option>
              <option value="DELIVERED">Delivered</option>
              <option value="COMPLETED">Completed</option>
              <option value="UNREPAIRABLE">Unrepairable</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Customer-Visible Note</label>
            <Input
              placeholder="Visible to customer in repair timeline"
              value={statusForm.customerVisibleNote}
              onChange={(e) => setStatusForm({ ...statusForm, customerVisibleNote: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Private Internal Staff Note</label>
            <Input
              placeholder="Only visible to internal business staff"
              value={statusForm.internalNote}
              onChange={(e) => setStatusForm({ ...statusForm, internalNote: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Status'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog open={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="Edit Technical Details & Costs">
        <form onSubmit={handleUpdateDetails} className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Technician Diagnosis</label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={detailsForm.diagnosis}
              onChange={(e) => setDetailsForm({ ...detailsForm, diagnosis: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Work Performed</label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={detailsForm.workPerformed}
              onChange={(e) => setDetailsForm({ ...detailsForm, workPerformed: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Parts Replaced</label>
            <Input
              placeholder="e.g. Display Assembly (Part #DSP-489)"
              value={detailsForm.partsReplaced}
              onChange={(e) => setDetailsForm({ ...detailsForm, partsReplaced: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Labor Cost (BDT Cents)</label>
              <Input
                type="number"
                value={detailsForm.laborCostCents}
                onChange={(e) => setDetailsForm({ ...detailsForm, laborCostCents: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Parts Cost (BDT Cents)</label>
              <Input
                type="number"
                value={detailsForm.partsCostCents}
                onChange={(e) => setDetailsForm({ ...detailsForm, partsCostCents: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Warranty Coverage Status</label>
            <Select
              value={detailsForm.warrantyCoverageStatus}
              onChange={(e) => setDetailsForm({ ...detailsForm, warrantyCoverageStatus: e.target.value })}
            >
              <option value="FULLY_COVERED">Fully Covered</option>
              <option value="PARTIALLY_COVERED">Partially Covered</option>
              <option value="NOT_COVERED">Not Covered</option>
              <option value="PENDING_DECISION">Pending Decision</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsDetailsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Technical Details'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
