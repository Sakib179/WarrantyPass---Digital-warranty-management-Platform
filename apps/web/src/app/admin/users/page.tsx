'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Badge, Dialog } from '@warrantypass/ui';
import { apiRequest } from '@/lib/api-client';

interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  kind: string;
  status: string;
  createdAt: string;
  sessionCount: number;
  productCount: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Action Dialog State
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [actionType, setActionType] = useState<'SUSPEND' | 'RESTORE' | 'REVOKE_SESSIONS' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AdminUserItem[]>(`/admin/users?query=${encodeURIComponent(search)}`);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handlePerformAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType) return;
    setSubmitting(true);
    try {
      await apiRequest(`/admin/users/${selectedUser.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: actionType, reason }),
      });
      setSelectedUser(null);
      setActionType(null);
      setReason('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to execute user action');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Administration</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Search registered customer and business accounts, review active sessions, and execute account controls.
          </p>
        </div>
        <Link href="/admin">
          <Button variant="secondary" size="sm">&larr; Back to Overview</Button>
        </Link>
      </div>

      <Card className="mb-6 p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <Input
            placeholder="Search user by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="primary">
            Search Users
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Searching platform users...</div>
      ) : users.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">No user accounts found matching your query.</Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Kind</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sessions / Products</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{u.fullName}</div>
                    <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                  </td>
                  <td className="p-3">
                    <Badge tone="info">{u.kind}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge tone={u.status === 'ACTIVE' ? 'success' : u.status === 'SUSPENDED' ? 'danger' : 'neutral'}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                    {u.sessionCount} Active Sessions &bull; {u.productCount} Products
                  </td>
                  <td className="p-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setSelectedUser(u); setActionType('REVOKE_SESSIONS'); }}
                      >
                        Revoke Sessions
                      </Button>
                      {u.status === 'SUSPENDED' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => { setSelectedUser(u); setActionType('RESTORE'); }}
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => { setSelectedUser(u); setActionType('SUSPEND'); }}
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
        open={Boolean(selectedUser && actionType)}
        onClose={() => { setSelectedUser(null); setActionType(null); }}
        title={`Execute ${actionType} on User Account`}
      >
        <form onSubmit={handlePerformAction} className="space-y-4 py-2">
          <p className="text-xs text-slate-600">
            Target User: <span className="font-bold">{selectedUser?.email}</span> ({selectedUser?.fullName})
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Audit Reason *</label>
            <textarea
              required
              rows={3}
              placeholder="State clear operational or security reason for audit logging..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => { setSelectedUser(null); setActionType(null); }}>
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
