'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Badge } from '@warrantypass/ui';
import { apiRequest } from '@/lib/api-client';

interface AuditLogItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
  actorUser?: { email: string };
  business?: { name: string };
  metadata?: any;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AuditLogItem[]>(`/admin/audit-logs?action=${encodeURIComponent(actionFilter)}`);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Immutable Platform Audit Log Viewer</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Append-only audit trail recording user, business, subscription, and admin operations.
          </p>
        </div>
        <Link href="/admin">
          <Button variant="secondary" size="sm">&larr; Back to Overview</Button>
        </Link>
      </div>

      <Card className="mb-6 p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <Input
            placeholder="Filter by action (e.g. admin.user.suspend)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="primary">
            Filter Logs
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">No audit log records match the selected filter.</Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target Resource</th>
                <th className="p-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="p-3 font-sans font-medium text-slate-900 dark:text-white">
                    {l.actorUser?.email || l.business?.name || 'System'}
                  </td>
                  <td className="p-3">
                    <Badge tone="info">{l.action}</Badge>
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">
                    {l.resourceType} {l.resourceId ? `(${l.resourceId.slice(0, 8)}...)` : ''}
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-xs">
                    {l.metadata ? JSON.stringify(l.metadata) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
