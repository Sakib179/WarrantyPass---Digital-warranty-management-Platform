'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '@warrantypass/ui';
import { apiRequest } from '@/lib/api-client';

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  pendingBusinessVerifications: number;
  suspendedBusinesses: number;
  activeSubscriptions: number;
  warrantiesIssued: number;
  openClaims: number;
  activeRepairs: number;
  pendingTransfers: number;
  activeRecalls: number;
  failedBackgroundJobs: number;
  recentSecurityEventsCount: number;
}

export default function PlatformAdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AdminMetrics>('/admin/overview');
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load platform operational overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) return <div className="py-12 text-center text-slate-500">Loading platform administration overview...</div>;
  if (error || !metrics) return <div className="py-12 text-center text-red-500">{error || 'Access denied or error loading metrics'}</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Platform Administration Portal</h1>
            <Badge tone="danger">SUPER ADMIN</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            System-wide operational reporting, tenant moderation, subscription overrides, audit logs, and security controls.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchOverview}>
          🔄 Refresh Metrics
        </Button>
      </div>

      {/* Admin Nav Bar */}
      <div className="mb-8 flex flex-wrap gap-2 border-b pb-4 border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <Link href="/admin"><Button variant="primary" size="sm">Overview</Button></Link>
        <Link href="/admin/users"><Button variant="secondary" size="sm">Users ({metrics.totalUsers})</Button></Link>
        <Link href="/admin/businesses"><Button variant="secondary" size="sm">Businesses ({metrics.totalBusinesses})</Button></Link>
        <Link href="/admin/subscriptions"><Button variant="secondary" size="sm">Subscriptions ({metrics.activeSubscriptions})</Button></Link>
        <Link href="/admin/settings"><Button variant="secondary" size="sm">System Settings & Flags</Button></Link>
        <Link href="/admin/audit-logs"><Button variant="secondary" size="sm">Audit Logs</Button></Link>
        <Link href="/admin/security-events"><Button variant="secondary" size="sm">Security Events ({metrics.recentSecurityEventsCount})</Button></Link>
      </div>

      {/* Overview Stat Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="p-6 border-l-4 border-l-emerald-500">
          <span className="text-xs font-medium text-slate-500 uppercase">Users & Customers</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{metrics.totalUsers}</div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{metrics.activeUsers} Active</span>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-500">
          <span className="text-xs font-medium text-slate-500 uppercase">Merchant Businesses</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{metrics.totalBusinesses}</div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
            {metrics.verifiedBusinesses} Verified &bull; {metrics.pendingBusinessVerifications} Pending
          </span>
        </Card>

        <Card className="p-6 border-l-4 border-l-indigo-500">
          <span className="text-xs font-medium text-slate-500 uppercase">Verified Digital Warranties</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{metrics.warrantiesIssued}</div>
          <span className="text-xs text-slate-500">{metrics.pendingTransfers} Pending Transfers</span>
        </Card>

        <Card className="p-6 border-l-4 border-l-amber-500">
          <span className="text-xs font-medium text-slate-500 uppercase">Active Operations</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{metrics.openClaims}</div>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
            Open Claims &bull; {metrics.activeRepairs} Active Repairs
          </span>
        </Card>
      </div>

      {/* Alert & System Health Card */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
          System Operational Health & Queue Alerts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800">
            <span className="text-xs text-slate-500 block">Failed Background Jobs</span>
            <span className={`text-2xl font-bold ${metrics.failedBackgroundJobs > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {metrics.failedBackgroundJobs}
            </span>
          </div>
          <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800">
            <span className="text-xs text-slate-500 block">Recent Security Alerts (24h)</span>
            <span className={`text-2xl font-bold ${metrics.recentSecurityEventsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {metrics.recentSecurityEventsCount}
            </span>
          </div>
          <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800">
            <span className="text-xs text-slate-500 block">Suspended Businesses</span>
            <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              {metrics.suspendedBusinesses}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
