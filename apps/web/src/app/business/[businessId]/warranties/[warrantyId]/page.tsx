'use client';

import { use, useEffect, useState } from 'react';
import type { IssuedWarrantyDto } from '@warrantypass/shared';
import { Button, Card, Badge, Dialog, Input } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../../lib/api-client.js';

export default function BusinessWarrantyDetailPage({
  params,
}: {
  params: Promise<{ businessId: string; warrantyId: string }>;
}) {
  const { businessId, warrantyId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [warranty, setWarranty] = useState<IssuedWarrantyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCorrectModalOpen, setIsCorrectModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  // Form states
  const [correctForm, setCorrectForm] = useState({ serialNumber: '', reason: '', termsSummary: '' });
  const [revokeForm, setRevokeForm] = useState({ reason: '' });
  const [actionSaving, setActionSaving] = useState(false);

  const fetchWarranty = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<IssuedWarrantyDto>(`/business/warranties/${warrantyId}`);
      setWarranty(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch warranty detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranty();
  }, [businessId, warrantyId]);

  const handleCorrectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSaving(true);
    try {
      await apiRequest(`/business/warranties/${warrantyId}/corrections`, {
        method: 'POST',
        body: JSON.stringify({
          reason: correctForm.reason,
          ...(correctForm.serialNumber ? { serialNumber: correctForm.serialNumber } : {}),
          ...(correctForm.termsSummary ? { termsSummary: correctForm.termsSummary } : {}),
        }),
      });
      setIsCorrectModalOpen(false);
      fetchWarranty();
    } catch (err: any) {
      alert(err.message || 'Failed to correct warranty');
    } finally {
      setActionSaving(false);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSaving(true);
    try {
      await apiRequest(`/business/warranties/${warrantyId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason: revokeForm.reason }),
      });
      setIsRevokeModalOpen(false);
      fetchWarranty();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke warranty');
    } finally {
      setActionSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Loading warranty details...</div>;
  if (error || !warranty) return <div className="py-12 text-center text-red-500">{error || 'Warranty not found'}</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
              {warranty.warrantyNumber}
            </h1>
            <Badge tone={warranty.status === 'ACTIVE' ? 'success' : warranty.status === 'REVOKED' ? 'danger' : 'neutral'}>
              {warranty.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Verification Code: <code className="font-mono text-emerald-600 dark:text-emerald-400">{warranty.verificationCode}</code>
          </p>
        </div>
        {warranty.status === 'ACTIVE' && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setCorrectForm({ serialNumber: warranty.serialNumber, reason: '', termsSummary: warranty.termsSummary });
                setIsCorrectModalOpen(true);
              }}
            >
              Correct Warranty
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setRevokeForm({ reason: '' });
                setIsRevokeModalOpen(true);
              }}
            >
              Revoke Warranty
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
            Product & Warranty Details
          </h2>
          <div>
            <span className="text-xs text-slate-500 block">Product Name</span>
            <span className="font-medium text-slate-900 dark:text-white">{warranty.productName}</span>
          </div>
          {warranty.modelNumber && (
            <div>
              <span className="text-xs text-slate-500 block">Model Number</span>
              <span className="font-medium text-slate-900 dark:text-white">{warranty.modelNumber}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-slate-500 block">Serial Number</span>
            <span className="font-mono text-slate-900 dark:text-white">{warranty.serialNumber}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Coverage Duration</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {new Date(warranty.startDate).toLocaleDateString()} &mdash; {new Date(warranty.endDate).toLocaleDateString()}
            </span>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
            Recipient / Customer Information
          </h2>
          <div>
            <span className="text-xs text-slate-500 block">Recipient Email</span>
            <span className="font-medium text-slate-900 dark:text-white">{warranty.customerEmail || 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Recipient Name</span>
            <span className="font-medium text-slate-900 dark:text-white">{warranty.customerName || 'Pending Claim'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Recipient Status</span>
            <Badge tone={warranty.isPendingRecipient ? 'neutral' : 'success'}>
              {warranty.isPendingRecipient ? 'Invitation Pending' : 'Account Linked'}
            </Badge>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Terms & Coverage Summary</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{warranty.termsSummary}</p>
      </Card>

      {/* Correction Dialog */}
      <Dialog open={isCorrectModalOpen} onClose={() => setIsCorrectModalOpen(false)} title="Correct Issued Warranty">
        <form onSubmit={handleCorrectSubmit} className="space-y-4 py-2">
          <p className="text-xs text-slate-500">
            Corrections create an immutable revision audit entry. Enter details to amend.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Reason for Correction *</label>
            <Input
              required
              placeholder="e.g. Typo in serial number on receipt"
              value={correctForm.reason}
              onChange={(e) => setCorrectForm({ ...correctForm, reason: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Serial Number</label>
            <Input
              value={correctForm.serialNumber}
              onChange={(e) => setCorrectForm({ ...correctForm, serialNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Terms Summary</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={correctForm.termsSummary}
              onChange={(e) => setCorrectForm({ ...correctForm, termsSummary: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCorrectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionSaving}>
              {actionSaving ? 'Saving...' : 'Apply Correction'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Revocation Dialog */}
      <Dialog open={isRevokeModalOpen} onClose={() => setIsRevokeModalOpen(false)} title="Revoke Warranty">
        <form onSubmit={handleRevokeSubmit} className="space-y-4 py-2">
          <p className="text-xs text-red-500 font-medium">
            Warning: Revoking a warranty renders it permanently invalid for future claims and notifies the customer.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Revocation Reason *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Fraudulent transaction / refunded purchase"
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={revokeForm.reason}
              onChange={(e) => setRevokeForm({ ...revokeForm, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsRevokeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={actionSaving}>
              {actionSaving ? 'Revoking...' : 'Confirm Revocation'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
