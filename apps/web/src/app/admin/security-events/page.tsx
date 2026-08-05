'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Badge, Dialog } from '@warrantypass/ui';
import { apiRequest } from '@/lib/api-client';

interface SecurityEventItem {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  actorUser?: { email: string };
  business?: { name: string };
  ipAddress?: string | null;
}

export default function AdminSecurityEventsPage() {
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolution Dialog State
  const [selectedEvent, setSelectedEvent] = useState<SecurityEventItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSecurityEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<SecurityEventItem[]>('/admin/security-events');
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load security events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setSubmitting(true);
    try {
      await apiRequest(`/admin/security-events/${selectedEvent.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolutionNote }),
      });
      setSelectedEvent(null);
      setResolutionNote('');
      fetchSecurityEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve security event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Security Event Monitoring & Incident Response</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time security telemetry for credential stuffing, token reuse, public rate throttling, and cross-tenant access attempts.
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
        <div className="py-12 text-center text-slate-500">Loading security events...</div>
      ) : events.length === 0 ? (
        <Card className="py-12 text-center p-6 text-slate-500">No unresolved security telemetry events.</Card>
      ) : (
        <div className="space-y-4">
          {events.map((e) => (
            <Card key={e.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={e.severity === 'CRITICAL' ? 'danger' : e.severity === 'HIGH' ? 'warning' : 'info'}>
                    {e.severity}
                  </Badge>
                  <span className="font-mono text-xs text-slate-400">{new Date(e.detectedAt).toLocaleString()}</span>
                  {e.resolvedAt && <Badge tone="success">RESOLVED</Badge>}
                </div>
                <h3 className="text-base font-bold font-mono text-slate-900 dark:text-white">{e.type}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Actor: {e.actorUser?.email || e.business?.name || 'Unknown'} &bull; IP: {e.ipAddress || 'Internal'}
                </p>
                {e.resolutionNote && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-sans">
                    <span className="font-bold">Resolution Note:</span> {e.resolutionNote}
                  </p>
                )}
              </div>

              {!e.resolvedAt && (
                <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(e)}>
                  Mark Resolved
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      <Dialog open={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)} title="Resolve Security Incident Alert">
        <form onSubmit={handleResolveSubmit} className="space-y-4 py-2">
          <p className="text-xs text-slate-600">
            Event Type: <span className="font-bold font-mono">{selectedEvent?.type}</span>
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Incident Resolution Note *</label>
            <textarea
              required
              rows={3}
              placeholder="State investigation findings and mitigation steps taken..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setSelectedEvent(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Resolve Event'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
