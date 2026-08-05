'use client';

import { use, useEffect, useState } from 'react';
import type { OwnershipTransferDto, BusinessTransferPolicyDto } from '@warrantypass/shared';
import { Button, Card, Badge, Input, Dialog } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function BusinessTransfersPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [transfers, setTransfers] = useState<OwnershipTransferDto[]>([]);
  const [policy, setPolicy] = useState<BusinessTransferPolicyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Policy Modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    isTransferAllowed: true,
    requireBusinessApproval: true,
    maxTransfersPerWarranty: 3,
    minRemainingDaysRequired: 30,
    transferRepairHistoryAllowed: true,
  });
  const [savingPolicy, setSavingPolicy] = useState(false);

  const fetchTransfersAndPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tData, pData] = await Promise.all([
        apiRequest<OwnershipTransferDto[]>('/business/transfers'),
        apiRequest<BusinessTransferPolicyDto>('/business/transfers/policy'),
      ]);
      setTransfers(tData);
      setPolicy(pData);
      setPolicyForm({
        isTransferAllowed: pData.isTransferAllowed,
        requireBusinessApproval: pData.requireBusinessApproval,
        maxTransfersPerWarranty: pData.maxTransfersPerWarranty,
        minRemainingDaysRequired: pData.minRemainingDaysRequired,
        transferRepairHistoryAllowed: pData.transferRepairHistoryAllowed,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load transfer reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfersAndPolicy();
  }, [businessId]);

  const handleReview = async (transferId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await apiRequest(`/business/transfers/${transferId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      fetchTransfersAndPolicy();
    } catch (err: any) {
      alert(err.message || 'Failed to review transfer request');
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      await apiRequest('/business/transfers/policy', {
        method: 'PUT',
        body: JSON.stringify(policyForm),
      });
      setIsPolicyModalOpen(false);
      fetchTransfersAndPolicy();
    } catch (err: any) {
      alert(err.message || 'Failed to update policy');
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Warranty Ownership Transfer Reviews</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Review customer ownership transfer requests and configure brand transfer policy rules.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setIsPolicyModalOpen(true)}>
          ⚙️ Configure Transfer Policy
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading transfer requests...</div>
      ) : transfers.length === 0 ? (
        <Card className="py-12 text-center p-6 text-slate-500">
          No ownership transfer requests recorded for your business warranties.
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="p-3">Transfer #</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Previous Owner (Sender)</th>
                  <th className="p-3">Recipient Email</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Initiated</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">
                      {t.transferNumber}
                    </td>
                    <td className="p-3 font-medium">{t.productName || 'Verified Product'}</td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">{t.senderName || 'Current Owner'}</td>
                    <td className="p-3 text-xs font-mono">{t.recipientEmail}</td>
                    <td className="p-3">
                      <Badge tone={t.status === 'COMPLETED' ? 'success' : t.status === 'PENDING_BUSINESS_APPROVAL' ? 'warning' : 'neutral'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      {t.status === 'PENDING_BUSINESS_APPROVAL' ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="danger" size="sm" onClick={() => handleReview(t.id, 'REJECT')}>
                            Reject
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => handleReview(t.id, 'APPROVE')}>
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configure Policy Modal */}
      <Dialog open={isPolicyModalOpen} onClose={() => setIsPolicyModalOpen(false)} title="Configure Business Transfer Policy">
        <form onSubmit={handleSavePolicy} className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Allow Warranty Transfers</label>
            <input
              type="checkbox"
              className="h-4 w-4 text-emerald-600 rounded"
              checked={policyForm.isTransferAllowed}
              onChange={(e) => setPolicyForm({ ...policyForm, isTransferAllowed: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Require Merchant Audit Approval</label>
            <input
              type="checkbox"
              className="h-4 w-4 text-emerald-600 rounded"
              checked={policyForm.requireBusinessApproval}
              onChange={(e) => setPolicyForm({ ...policyForm, requireBusinessApproval: e.target.checked })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Max Transfers Per Warranty</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={policyForm.maxTransfersPerWarranty}
              onChange={(e) => setPolicyForm({ ...policyForm, maxTransfersPerWarranty: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Min Remaining Days Required</label>
            <Input
              type="number"
              min={0}
              max={365}
              value={policyForm.minRemainingDaysRequired}
              onChange={(e) => setPolicyForm({ ...policyForm, minRemainingDaysRequired: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsPolicyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={savingPolicy}>
              {savingPolicy ? 'Saving...' : 'Save Policy Settings'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
