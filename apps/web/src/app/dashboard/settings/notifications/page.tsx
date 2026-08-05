'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@warrantypass/ui';
import { apiRequest } from '../../../../lib/api-client.js';

interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  claimUpdatesEnabled: boolean;
  repairUpdatesEnabled: boolean;
  transferUpdatesEnabled: boolean;
  businessUpdatesEnabled: boolean;
}

export default function CustomerNotificationPreferencesPage() {
  const [pref, setPref] = useState<NotificationPreferences>({
    inAppEnabled: true,
    emailEnabled: true,
    claimUpdatesEnabled: true,
    repairUpdatesEnabled: true,
    transferUpdatesEnabled: true,
    businessUpdatesEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<NotificationPreferences>('/customer/notification-preferences');
      setPref(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await apiRequest<NotificationPreferences>('/customer/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(pref),
      });
      setPref(updated);
      setSuccessMsg('Notification preferences updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Notification Preferences</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage how and when you receive automated updates across WarrantyPass channels.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-6 rounded-lg bg-emerald-50 p-4 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading preferences...</div>
      ) : (
        <Card className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Essential Notices Alert */}
            <div className="rounded-md bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="font-bold">Operational Note:</span> Legally and operationally essential communications (such as password resets, account security alerts, and critical product safety recalls) are always delivered regardless of email preference settings.
            </div>

            <div className="space-y-4 border-b pb-6 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Primary Delivery Channels</h2>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium block">In-App Notification Center</label>
                  <span className="text-xs text-slate-500">Receive interactive alerts inside your dashboard header</span>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  checked={pref.inAppEnabled}
                  onChange={(e) => setPref({ ...pref, inAppEnabled: e.target.checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium block">Email Notifications</label>
                  <span className="text-xs text-slate-500">Send copies of important updates directly to your registered email</span>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  checked={pref.emailEnabled}
                  onChange={(e) => setPref({ ...pref, emailEnabled: e.target.checked })}
                />
              </div>
            </div>

            <div className="space-y-4 border-b pb-6 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Topic Categories</h2>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium block">Warranty Claim Status Updates</label>
                  <span className="text-xs text-slate-500">Claim review decisions, approval, rejection, and message notifications</span>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  checked={pref.claimUpdatesEnabled}
                  onChange={(e) => setPref({ ...pref, claimUpdatesEnabled: e.target.checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium block">Product Servicing & Repair Timeline</label>
                  <span className="text-xs text-slate-500">Service center assignment, technician diagnosis, and ready-for-collection alerts</span>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  checked={pref.repairUpdatesEnabled}
                  onChange={(e) => setPref({ ...pref, repairUpdatesEnabled: e.target.checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium block">Ownership Transfer Alerts</label>
                  <span className="text-xs text-slate-500">Incoming transfer invitations, acceptance responses, and completion receipts</span>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  checked={pref.transferUpdatesEnabled}
                  onChange={(e) => setPref({ ...pref, transferUpdatesEnabled: e.target.checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
