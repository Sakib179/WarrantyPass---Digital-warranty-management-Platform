'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Badge } from '@warrantypass/ui';
import { apiRequest } from '../../../lib/api-client.js';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<NotificationItem[]>(`/customer/notifications?unreadOnly=${unreadOnly}`);
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/customer/notifications/${id}/read`, { method: 'POST' });
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/customer/notifications/read-all', { method: 'POST' });
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to mark all as read');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge tone="danger">🚨 {severity}</Badge>;
      case 'WARNING':
        return <Badge tone="warning">⚠️ {severity}</Badge>;
      case 'SUCCESS':
        return <Badge tone="success">✓ {severity}</Badge>;
      default:
        return <Badge tone="info">{severity}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Notification Center</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time updates regarding your digital warranties, claim decisions, repair progress, and product safety notices.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant={unreadOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            {unreadOnly ? 'Show All' : 'Filter Unread Only'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead}>
            Mark All as Read
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <Card className="py-12 text-center p-6 text-slate-500">
          <p className="font-semibold text-slate-700 dark:text-slate-300">No notifications found.</p>
          <p className="text-xs text-slate-400 mt-1">You are all caught up!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                !n.readAt ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getSeverityBadge(n.severity)}
                  <span className="text-xs text-slate-400 font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                  {!n.readAt && <span className="text-xs text-emerald-600 font-bold dark:text-emerald-400">&bull; NEW</span>}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{n.title}</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{n.message}</p>
              </div>

              <div className="flex items-center gap-3">
                {n.actionUrl && (
                  <Link href={n.actionUrl}>
                    <Button variant="secondary" size="sm">
                      View Details
                    </Button>
                  </Link>
                )}
                {!n.readAt && (
                  <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(n.id)}>
                    Mark Read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
