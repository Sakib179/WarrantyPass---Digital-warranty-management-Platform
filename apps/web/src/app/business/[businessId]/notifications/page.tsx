'use client';

import { use, useEffect, useState } from 'react';
import type { NotificationDto } from '@warrantypass/shared';
import { Card, Badge, Button } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function BusinessNotificationsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<NotificationDto[]>('/business/notifications');
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load business notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [businessId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Business Activity & Security Alerts</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time notifications for incoming customer claims, transfer approvals, subscription updates, and security events.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading business notifications...</div>
      ) : notifications.length === 0 ? (
        <Card className="py-12 text-center p-6 text-slate-500">
          No business notifications recorded.
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={n.severity === 'CRITICAL' ? 'danger' : 'info'}>{n.severity}</Badge>
                  <span className="text-xs text-slate-400 font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{n.title}</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{n.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
