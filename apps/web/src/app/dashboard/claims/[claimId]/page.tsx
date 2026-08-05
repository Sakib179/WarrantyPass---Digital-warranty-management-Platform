'use client';

import { use, useEffect, useState } from 'react';
import type { CustomerClaimDetailDto } from '@warrantypass/shared';
import { Button, Card, Badge, Dialog, Input } from '@warrantypass/ui';
import { apiRequest } from '../../../../lib/api-client.js';

export default function CustomerClaimDetailPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const { claimId } = use(params);

  const [claim, setClaim] = useState<CustomerClaimDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Message state
  const [messageText, setMessageText] = useState('');
  const [isPostingMessage, setIsPostingMessage] = useState(false);

  // Cancel Dialog
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<CustomerClaimDetailDto>(`/customer/claims/${claimId}`);
      setClaim(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch claim details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaim();
  }, [claimId]);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setIsPostingMessage(true);
    try {
      await apiRequest(`/customer/claims/${claimId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: messageText, isInternalNote: false }),
      });
      setMessageText('');
      fetchClaim();
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setIsPostingMessage(false);
    }
  };

  const handleCancelClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCancelling(true);
    try {
      await apiRequest(`/customer/claims/${claimId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancellationReason }),
      });
      setIsCancelModalOpen(false);
      fetchClaim();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel claim');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Loading claim details...</div>;
  if (error || !claim) return <div className="py-12 text-center text-red-500">{error || 'Claim not found'}</div>;

  const canCancel = !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(claim.status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
              {claim.referenceNumber}
            </h1>
            <Badge tone={claim.status === 'MORE_INFORMATION_REQUIRED' ? 'warning' : 'info'}>
              {claim.status === 'MORE_INFORMATION_REQUIRED' ? 'Action Required' : claim.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Issuing Business: <span className="font-semibold text-slate-900 dark:text-white">{claim.businessName}</span>
          </p>
        </div>
        {canCancel && (
          <Button variant="danger" size="sm" onClick={() => setIsCancelModalOpen(true)}>
            Cancel Claim
          </Button>
        )}
      </div>

      {claim.status === 'MORE_INFORMATION_REQUIRED' && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/40 dark:border-amber-900/40">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300">Action Required: More Information Requested</h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            {claim.moreInfoRequestedNotes || 'The business support team requested additional details regarding your claim.'}
          </p>
          <p className="mt-2 text-xs font-medium text-amber-900 dark:text-amber-200">
            Please reply below in the conversation message box to submit the requested information.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Details & Chat */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{claim.subject}</h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{claim.description}</p>
          </Card>

          {/* Conversation Chat */}
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-800">
              Support Messages & Updates
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto mb-4 p-2">
              {claim.messages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No messages yet. Send a message to the business support team below.</p>
              ) : (
                claim.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-lg text-sm ${
                      m.senderType === 'CUSTOMER'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 ml-6'
                        : 'bg-slate-50 dark:bg-slate-800 mr-6'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
                      <span className="font-semibold">{m.senderName} ({m.senderType})</span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handlePostMessage} className="flex gap-2 border-t pt-3 border-slate-100 dark:border-slate-800">
              <Input
                placeholder="Type a message or response..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <Button type="submit" variant="primary" disabled={isPostingMessage}>
                Send
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Col: Timeline & Summary */}
        <div className="space-y-6">
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
              Warranty Covered Product
            </h3>
            <div>
              <span className="text-xs text-slate-500 block">Product</span>
              <span className="text-sm font-medium">{claim.productName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Serial Number</span>
              <span className="text-sm font-mono">{claim.serialNumber}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Warranty #</span>
              <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">{claim.warrantyNumber}</span>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 border-b pb-2 dark:border-slate-800">
              Status Timeline
            </h3>
            <div className="space-y-3 text-xs">
              {claim.statusTimeline.map((h) => (
                <div key={h.id} className="border-l-2 border-slate-300 pl-3 dark:border-slate-700">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {h.fromStatus ? `${h.fromStatus} ➔ ${h.toStatus}` : h.toStatus}
                  </div>
                  <div className="text-slate-500">{new Date(h.createdAt).toLocaleString()}</div>
                  {h.publicNote && <div className="mt-1 text-slate-600 dark:text-slate-400">{h.publicNote}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Cancel Claim">
        <form onSubmit={handleCancelClaim} className="space-y-4 py-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Are you sure you want to cancel this warranty claim?
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Reason for Cancellation *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Issue resolved on its own"
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCancelModalOpen(false)}>
              Keep Claim
            </Button>
            <Button type="submit" variant="danger" disabled={isCancelling}>
              {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
