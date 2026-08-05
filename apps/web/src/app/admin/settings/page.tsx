'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Badge, Input, Dialog } from '@warrantypass/ui';
import { apiRequest } from '@/lib/api-client';

interface FeatureFlagItem {
  id: string;
  key: string;
  isEnabled: boolean;
  description: string | null;
}

interface SystemSettingItem {
  id: string;
  key: string;
  value: any;
  description: string | null;
}

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [settings, setSettings] = useState<SystemSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Flag Dialog
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlagItem | null>(null);
  const [savingFlag, setSavingFlag] = useState(false);

  const fetchFlagsAndSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fData, sData] = await Promise.all([
        apiRequest<FeatureFlagItem[]>('/admin/feature-flags'),
        apiRequest<SystemSettingItem[]>('/admin/system-settings'),
      ]);
      setFlags(fData);
      setSettings(sData);
    } catch (err: any) {
      setError(err.message || 'Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlagsAndSettings();
  }, []);

  const handleToggleFlag = async (flag: FeatureFlagItem) => {
    try {
      await apiRequest('/admin/feature-flags', {
        method: 'POST',
        body: JSON.stringify({
          key: flag.key,
          isEnabled: !flag.isEnabled,
          description: flag.description,
        }),
      });
      fetchFlagsAndSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle feature flag');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">System Settings & Feature Flags</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Backend-enforced feature flags, system configuration limits, and operational parameters.
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
        <div className="py-12 text-center text-slate-500">Loading platform settings...</div>
      ) : (
        <div className="space-y-8">
          {/* Feature Flags Section */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Backend Feature Flags</h2>
            <div className="space-y-3">
              {flags.map((f) => (
                <div key={f.id} className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{f.key}</span>
                      <Badge tone={f.isEnabled ? 'success' : 'neutral'}>
                        {f.isEnabled ? 'ENABLED' : 'DISABLED'}
                      </Badge>
                    </div>
                    {f.description && <p className="text-xs text-slate-500 mt-1">{f.description}</p>}
                  </div>

                  <Button
                    variant={f.isEnabled ? 'danger' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleFlag(f)}
                  >
                    {f.isEnabled ? 'Disable Feature' : 'Enable Feature'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
