'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Badge, Dialog, Input, Select } from '@warrantypass/ui';
import { apiRequest } from '@/lib/api-client';

interface AdminSubscriptionItem {
  id: string;
  ownerType: string;
  planKey: string;
  status: string;
  billingInterval: string;
  currentPeriodEnd: string;
  createdAt: string;
  user?: { email: string };
  business?: { name: string };
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Override Modal State
  const [selectedSub, setSelectedSub] = useState<AdminSubscriptionItem | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    planKey: 'BUSINESS_PRO',
    status: 'ACTIVE',
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AdminSubscriptionItem[]>('/admin/subscriptions');
      setSubscriptions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription administration records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setSubmitting(true);
    try {
      await apiRequest(`/admin/subscriptions/${selectedSub.id}/override`, {
        method: 'POST',
        body: JSON.stringify(overrideForm),
      });
      setSelectedSub(null);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message || 'Failed to override subscription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Subscription & Payment Administration</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Monitor active merchant & customer subscriptions, review billing state, and execute manual plan overrides.
          </p>
        </div>
        <Link href="/admin">
          <Button variant="secondary" size="sm">&larr; Back to Overview</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading subscription records...</div>
      ) : subscriptions.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">No active or archived subscription records found.</Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3">Target Account</th>
                <th className="p-3">Owner Type</th>
                <th className="p-3">Plan Key</th>
                <th className="p-3">Status</th>
                <th className="p-3">Expires At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    {s.business?.name || s.user?.email || 'N/A'}
                  </td>
                  <td className="p-3">
                    <Badge tone="info">{s.ownerType}</Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">{s.planKey}</td>
                  <td className="p-3">
                    <Badge tone={s.status === 'ACTIVE' ? 'success' : s.status === 'PAST_DUE' ? 'warning' : 'neutral'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{new Date(s.currentPeriodEnd).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedSub(s);
                        setOverrideForm({
                          planKey: s.planKey,
                          status: s.status,
                          currentPeriodEnd: s.currentPeriodEnd,
                          reason: '',
                        });
                      }}
                    >
                      Override Subscription
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Override Dialog */}
      <Dialog open={Boolean(selectedSub)} onClose={() => setSelectedSub(null)} title="Execute Manual Subscription Override">
        <form onSubmit={handleOverrideSubmit} className="space-y-4 py-2">
          <p className="text-xs text-slate-600">
            Target: <span className="font-bold">{selectedSub?.business?.name || selectedSub?.user?.email}</span>
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Plan Key *</label>
            <Input
              required
              value={overrideForm.planKey}
              onChange={(e) => setOverrideForm({ ...overrideForm, planKey: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Subscription Status *</label>
            <Select
              value={overrideForm.status}
              onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
            >
              <option value="ACTIVE">Active</option>
              <option value="TRIALING">Trialing</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="PAUSED">Paused</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Expiration Period End (ISO Date) *</label>
            <Input
              required
              value={overrideForm.currentPeriodEnd}
              onChange={(e) => setOverrideForm({ ...overrideForm, currentPeriodEnd: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Override Audit Reason *</label>
            <textarea
              required
              rows={2}
              placeholder="State reason for manual admin override (e.g. VIP merchant promotion)..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={overrideForm.reason}
              onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setSelectedSub(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Applying...' : 'Apply Subscription Override'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
