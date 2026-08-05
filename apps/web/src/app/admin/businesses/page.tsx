'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Badge, Dialog } from '@warrantypass/ui';
import { apiRequest } from '@/lib/api-client';

interface AdminBusinessItem {
  id: string;
  name: string;
  legalName: string | null;
  registrationNumber: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  memberCount: number;
  warrantyCount: number;
  claimCount: number;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<AdminBusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Action Dialog State
  const [selectedBusiness, setSelectedBusiness] = useState<AdminBusinessItem | null>(null);
  const [actionType, setActionType] = useState<'SUSPEND' | 'RESTORE' | 'VERIFY' | 'REJECT' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBusinesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AdminBusinessItem[]>(`/admin/businesses?query=${encodeURIComponent(search)}`);
      setBusinesses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBusinesses();
  };

  const handlePerformAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !actionType) return;
    setSubmitting(true);
    try {
      await apiRequest(`/admin/businesses/${selectedBusiness.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: actionType, reason }),
      });
      setSelectedBusiness(null);
      setActionType(null);
      setReason('');
      fetchBusinesses();
    } catch (err: any) {
      alert(err.message || 'Failed to execute business action');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Merchant Business Administration</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Review business registration details, manage verification approvals, and suspend or restore merchant accounts.
          </p>
        </div>
        <Link href="/admin">
          <Button variant="secondary" size="sm">&larr; Back to Overview</Button>
        </Link>
      </div>

      <Card className="mb-6 p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <Input
            placeholder="Search business by name, email, or registration number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="primary">
            Search Businesses
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Searching business accounts...</div>
      ) : businesses.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">No merchant businesses found matching your query.</Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3">Business Name</th>
                <th className="p-3">Reg #</th>
                <th className="p-3">Status</th>
                <th className="p-3">Warranties / Claims</th>
                <th className="p-3">Registered</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{b.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{b.email}</div>
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{b.registrationNumber}</td>
                  <td className="p-3">
                    <Badge tone={b.status === 'VERIFIED' ? 'success' : b.status === 'SUSPENDED' ? 'danger' : 'warning'}>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                    {b.warrantyCount} Warranties &bull; {b.claimCount} Claims
                  </td>
                  <td className="p-3 text-xs text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      {b.status === 'SUSPENDED' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => { setSelectedBusiness(b); setActionType('RESTORE'); }}
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => { setSelectedBusiness(b); setActionType('SUSPEND'); }}
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog
        open={Boolean(selectedBusiness && actionType)}
        onClose={() => { setSelectedBusiness(null); setActionType(null); }}
        title={`Execute ${actionType} on Business Account`}
      >
        <form onSubmit={handlePerformAction} className="space-y-4 py-2">
          <p className="text-xs text-slate-600">
            Target Business: <span className="font-bold">{selectedBusiness?.name}</span> ({selectedBusiness?.registrationNumber})
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Audit Reason *</label>
            <textarea
              required
              rows={3}
              placeholder="State clear reason for business status modification..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => { setSelectedBusiness(null); setActionType(null); }}>
              Cancel
            </Button>
            <Button type="submit" variant={actionType === 'SUSPEND' ? 'danger' : 'primary'} disabled={submitting}>
              {submitting ? 'Executing...' : `Confirm ${actionType}`}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
