'use client';

import { use, useEffect, useState } from 'react';
import type { BusinessClaimDetailDto } from '@warrantypass/shared';
import { Button, Card, Badge, Dialog, Input, Select } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../../lib/api-client.js';

export default function BusinessClaimDetailPage({
  params,
}: {
  params: Promise<{ businessId: string; claimId: string }>;
}) {
  const { businessId, claimId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [claim, setClaim] = useState<BusinessClaimDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs for messages
  const [activeTab, setActiveTab] = useState<'public' | 'internal'>('public');

  // Modals / Dialogs
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Message input
  const [messageText, setMessageText] = useState('');
  const [isPostingMessage, setIsPostingMessage] = useState(false);

  // Status Form
  const [statusForm, setStatusForm] = useState({
    status: 'UNDER_REVIEW',
    publicNote: '',
    internalNote: '',
    rejectionCategory: '',
    rejectionReason: '',
    moreInfoRequestedNotes: '',
  });

  // Assign Form
  const [assigneeId, setAssigneeId] = useState('');
  const [actionSaving, setActionSaving] = useState(false);

  const fetchClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<BusinessClaimDetailDto>(`/business/claims/${claimId}`);
      setClaim(data);
      setStatusForm((prev) => ({ ...prev, status: data.status }));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch claim detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaim();
  }, [businessId, claimId]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSaving(true);
    try {
      await apiRequest(`/business/claims/${claimId}/status`, {
        method: 'POST',
        body: JSON.stringify(statusForm),
      });
      setIsStatusModalOpen(false);
      fetchClaim();
    } catch (err: any) {
      alert(err.message || 'Failed to update claim status');
    } finally {
      setActionSaving(false);
    }
  };

  const handleAssignClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSaving(true);
    try {
      await apiRequest(`/business/claims/${claimId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignedBusinessMemberId: assigneeId || null }),
      });
      setIsAssignModalOpen(false);
      fetchClaim();
    } catch (err: any) {
      alert(err.message || 'Failed to assign claim');
    } finally {
      setActionSaving(false);
    }
  };

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setIsPostingMessage(true);
    try {
      await apiRequest(`/business/claims/${claimId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message: messageText,
          isInternalNote: activeTab === 'internal',
        }),
      });
      setMessageText('');
      fetchClaim();
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setIsPostingMessage(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Loading claim details...</div>;
  if (error || !claim) return <div className="py-12 text-center text-red-500">{error || 'Claim not found'}</div>;

  const publicMessages = claim.messages.filter((m) => !m.isInternalNote);
  const internalNotes = claim.messages.filter((m) => m.isInternalNote);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
              {claim.referenceNumber}
            </h1>
            <Badge tone="warning">{claim.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Subject: <span className="font-semibold text-slate-900 dark:text-white">{claim.subject}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setIsAssignModalOpen(true)}>
            {claim.assignedMember ? `Assigned: ${claim.assignedMember.name}` : 'Assign Staff'}
          </Button>
          <Button variant="primary" onClick={() => setIsStatusModalOpen(true)}>
            Update Claim Status
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Details & Chat */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Problem Description</h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{claim.description}</p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Problem Start Date</span>
                <span className="font-medium">{claim.problemStartDate ? new Date(claim.problemStartDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Product Condition</span>
                <span className="font-medium">{claim.productCondition || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Preferred Contact</span>
                <span className="font-medium">{claim.preferredContactMethod || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Customer Phone</span>
                <span className="font-medium">{claim.customerPhone || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Messages & Notes Tabs */}
          <Card className="p-6">
            <div className="mb-4 flex border-b border-slate-200 dark:border-slate-800">
              <button
                className={`pb-2 px-4 text-sm font-medium border-b-2 ${
                  activeTab === 'public'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveTab('public')}
              >
                Customer Conversation ({publicMessages.length})
              </button>
              <button
                className={`pb-2 px-4 text-sm font-medium border-b-2 ${
                  activeTab === 'internal'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveTab('internal')}
              >
                Private Internal Notes ({internalNotes.length})
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-4 p-2">
              {(activeTab === 'public' ? publicMessages : internalNotes).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  {activeTab === 'public' ? 'No public messages exchanged yet.' : 'No internal notes recorded.'}
                </p>
              ) : (
                (activeTab === 'public' ? publicMessages : internalNotes).map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-lg text-sm ${
                      m.senderType === 'BUSINESS_EMPLOYEE'
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
                placeholder={activeTab === 'public' ? 'Write a message to the customer...' : 'Add a private internal note for staff...'}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <Button type="submit" variant="primary" disabled={isPostingMessage}>
                Send
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Col: Customer & Warranty Summary */}
        <div className="space-y-6">
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
              Customer Information
            </h3>
            <div>
              <span className="text-xs text-slate-500 block">Name</span>
              <span className="text-sm font-medium">{claim.customer.name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Email</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{claim.customer.email}</span>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
              Warranty Details
            </h3>
            <div>
              <span className="text-xs text-slate-500 block">Warranty #</span>
              <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {claim.warranty.warrantyNumber}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Product</span>
              <span className="text-sm font-medium">{claim.warranty.productName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Serial Number</span>
              <span className="text-sm font-mono">{claim.warranty.serialNumber}</span>
            </div>
          </Card>

          {/* Status History Timeline */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 border-b pb-2 dark:border-slate-800">
              Status Timeline
            </h3>
            <div className="space-y-3 text-xs">
              {claim.statusHistory.map((h) => (
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

      {/* Status Update Dialog */}
      <Dialog open={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Update Claim Status">
        <form onSubmit={handleUpdateStatus} className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">New Status *</label>
            <Select
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
            >
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="MORE_INFORMATION_REQUIRED">More Information Required</option>
              <option value="APPROVED">Approved</option>
              <option value="ASSIGNED">Assigned to Technician</option>
              <option value="PRODUCT_RECEIVED">Product Received at Center</option>
              <option value="IN_PROGRESS">Repair In Progress</option>
              <option value="READY_FOR_COLLECTION">Ready for Collection / Shipping</option>
              <option value="RESOLVED">Resolved / Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Public Note for Customer</label>
            <textarea
              rows={2}
              placeholder="Visible to the customer on their claim status timeline"
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={statusForm.publicNote}
              onChange={(e) => setStatusForm({ ...statusForm, publicNote: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Internal Staff Note (Private)</label>
            <textarea
              rows={2}
              placeholder="Private note only visible to business employees"
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={statusForm.internalNote}
              onChange={(e) => setStatusForm({ ...statusForm, internalNote: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionSaving}>
              {actionSaving ? 'Updating...' : 'Save Status'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Staff Assignment Dialog */}
      <Dialog open={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Staff Member">
        <form onSubmit={handleAssignClaim} className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Assignee Member ID</label>
            <Input
              placeholder="Enter business member ID or leave blank to unassign"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionSaving}>
              {actionSaving ? 'Saving...' : 'Confirm Assignment'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
