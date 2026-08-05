'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Badge, Dialog } from '@warrantypass/ui';
import { apiRequest } from '../../../../lib/api-client.js';

interface PrivacyRequestItem {
  id: string;
  requestType: string;
  status: string;
  requestedAt: string;
  downloadUrl?: string | null;
  rejectionReason?: string | null;
}

export default function CustomerPrivacyPage() {
  const [requests, setRequests] = useState<PrivacyRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deletion modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchPrivacyRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<PrivacyRequestItem[]>('/customer/privacy/requests');
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load privacy requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyRequests();
  }, []);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await apiRequest<any>('/customer/privacy/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `warrantypass-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to generate data export');
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDelete(true);
    try {
      await apiRequest('/customer/privacy/requests', {
        method: 'POST',
        body: JSON.stringify({
          requestType: 'DELETE_ACCOUNT',
          reason: deleteReason,
        }),
      });
      setIsDeleteModalOpen(false);
      setDeleteReason('');
      fetchPrivacyRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to submit account deletion request');
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy & Data Management</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Review stored personal information, export your complete digital record, or request account deletion.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Data Export Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Export Personal Account Data</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Download an immediate machine-readable JSON export of your registered account details, active digital warranties, claim logs, repair history, and ownership transfers.
              </p>
            </div>
            <Button variant="primary" onClick={handleExportData} disabled={exporting}>
              {exporting ? 'Generating JSON...' : '📥 Export My Data'}
            </Button>
          </div>
        </Card>

        {/* Account Deletion Card */}
        <Card className="p-6 border-l-4 border-l-red-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Account Deletion & Erasure Workflow</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Initiate a formal account deletion request. Data retention rules apply for merchant legal audit requirements and active warranty claim records.
              </p>
            </div>
            <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
              Request Account Deletion
            </Button>
          </div>
        </Card>

        {/* Privacy Requests Table */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Privacy Request Log</h2>
          {loading ? (
            <div className="py-6 text-center text-slate-500">Loading request history...</div>
          ) : requests.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">No formal privacy or deletion requests logged.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b pb-3 dark:border-slate-800 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.requestType}</span>
                    <div className="text-slate-500">{new Date(r.requestedAt).toLocaleString()}</div>
                  </div>
                  <Badge tone={r.status === 'COMPLETED' ? 'success' : r.status === 'REQUESTED' ? 'warning' : 'neutral'}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Account Deletion Dialog */}
      <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Account Deletion Request">
        <form onSubmit={handleRequestDeletion} className="space-y-4 py-2">
          <p className="text-xs text-red-600 font-semibold">
            Warning: Requesting account deletion will schedule your account for deactivation and review.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Reason for Deletion Request (Optional)</label>
            <textarea
              rows={3}
              placeholder="Tell us why you are leaving WarrantyPass..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={submittingDelete}>
              {submittingDelete ? 'Submitting...' : 'Submit Deletion Request'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
