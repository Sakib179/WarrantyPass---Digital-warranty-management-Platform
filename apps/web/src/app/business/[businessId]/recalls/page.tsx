'use client';

import { use, useEffect, useState } from 'react';
import type { RecallNoticeDto } from '@warrantypass/shared';
import { Button, Card, Badge, Dialog, Input, Select } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function BusinessRecallsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [recalls, setRecalls] = useState<RecallNoticeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Recall Dialog
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    severity: 'MEDIUM',
    noticeType: 'SAFETY_WARNING',
    description: '',
    customerInstructions: '',
    affectedModelNumbers: '',
    affectedSerialNumberRanges: '',
  });

  const fetchRecalls = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<RecallNoticeDto[]>('/business/recalls');
      setRecalls(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load recall notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecalls();
  }, [businessId]);

  const handleCreateRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const models = formData.affectedModelNumbers.split(',').map((m) => m.trim()).filter(Boolean);
      await apiRequest('/business/recalls', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title,
          severity: formData.severity,
          noticeType: formData.noticeType,
          description: formData.description,
          customerInstructions: formData.customerInstructions,
          affectedModelNumbers: models,
          affectedSerialNumberRanges: formData.affectedSerialNumberRanges || null,
        }),
      });
      setIsNewModalOpen(false);
      setFormData({
        title: '',
        severity: 'MEDIUM',
        noticeType: 'SAFETY_WARNING',
        description: '',
        customerInstructions: '',
        affectedModelNumbers: '',
        affectedSerialNumberRanges: '',
      });
      fetchRecalls();
    } catch (err: any) {
      alert(err.message || 'Failed to create recall notice');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (recallId: string) => {
    if (!confirm('Are you sure you want to publish this product recall notice? Affected customers will be targeted immediately.')) return;
    try {
      await apiRequest(`/business/recalls/${recallId}/publish`, {
        method: 'POST',
      });
      fetchRecalls();
    } catch (err: any) {
      alert(err.message || 'Failed to publish recall notice');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Recall & Safety Alerts</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Publish targeted safety warnings, product recall instructions, and campaign notices to affected customers.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsNewModalOpen(true)}>
          + Create Recall Notice
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading recall notices...</div>
      ) : recalls.length === 0 ? (
        <Card className="py-12 text-center p-6 text-slate-500">
          <p className="mb-4">No product recall or safety notices created.</p>
          <Button variant="primary" onClick={() => setIsNewModalOpen(true)}>
            Create First Notice
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="p-3">Ref #</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Type & Severity</th>
                  <th className="p-3">Affected Models</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Recipients / Acks</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recalls.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">
                      {r.publicReferenceNumber}
                    </td>
                    <td className="p-3 font-medium max-w-xs truncate">{r.title}</td>
                    <td className="p-3">
                      <div className="flex gap-1.5 items-center">
                        <Badge tone={r.severity === 'CRITICAL' || r.severity === 'HIGH' ? 'danger' : 'warning'}>
                          {r.severity}
                        </Badge>
                        <span className="text-xs text-slate-500">{r.noticeType}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs font-mono">{r.affectedModelNumbers.join(', ')}</td>
                    <td className="p-3">
                      <Badge tone={r.status === 'PUBLISHED' ? 'success' : 'neutral'}>{r.status}</Badge>
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                      {r.recipientCount ?? 0} notified &bull; {r.acknowledgementCount ?? 0} read
                    </td>
                    <td className="p-3 text-right">
                      {r.status === 'DRAFT' ? (
                        <Button variant="primary" size="sm" onClick={() => handlePublish(r.id)}>
                          Publish Notice
                        </Button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Published</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Notice Dialog */}
      <Dialog open={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Create Targeted Product Recall Notice">
        <form onSubmit={handleCreateRecall} className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Notice Title *</label>
            <Input
              required
              placeholder="e.g. Battery Inspection Notice for Model X200"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Severity *</label>
              <Select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notice Type *</label>
              <Select
                value={formData.noticeType}
                onChange={(e) => setFormData({ ...formData, noticeType: e.target.value })}
              >
                <option value="SAFETY_WARNING">Safety Warning</option>
                <option value="PRODUCT_RECALL">Product Recall</option>
                <option value="FREE_REPLACEMENT">Free Replacement</option>
                <option value="SOFTWARE_UPDATE">Software Update</option>
                <option value="INSPECTION_REQUIRED">Inspection Required</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Affected Model Numbers (Comma-separated) *</label>
            <Input
              required
              placeholder="e.g. MOD-X200, MOD-X201"
              value={formData.affectedModelNumbers}
              onChange={(e) => setFormData({ ...formData, affectedModelNumbers: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Detailed Issue Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe the defect or safety concern clearly..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Customer Action & Replacement Instructions *</label>
            <textarea
              required
              rows={3}
              placeholder="Instructions for customer (e.g. stop using device, bring to service center)..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={formData.customerInstructions}
              onChange={(e) => setFormData({ ...formData, customerInstructions: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Creating Draft...' : 'Save Draft Notice'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
