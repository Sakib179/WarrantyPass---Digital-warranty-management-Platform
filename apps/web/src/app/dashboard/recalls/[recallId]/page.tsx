'use client';

import { use, useEffect, useState } from 'react';
import { Button, Card, Badge } from '@warrantypass/ui';
import { apiRequest } from '../../../../lib/api-client.js';

interface RecallDetail {
  id: string;
  publicReferenceNumber: string;
  title: string;
  severity: string;
  noticeType: string;
  description: string;
  customerInstructions: string;
  publishedAt: string | null;
  businessName: string;
  businessContact: { phone: string | null; email: string | null };
  affectedProduct: { name: string; modelNumber: string | null; serialNumber: string | null };
  acknowledgedAt: string | null;
}

export default function CustomerRecallDetailPage({
  params,
}: {
  params: Promise<{ recallId: string }>;
}) {
  const { recallId } = use(params);

  const [recall, setRecall] = useState<RecallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [acknowledging, setAcknowledging] = useState(false);

  const fetchRecall = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<RecallDetail>(`/customer/recalls/${recallId}`);
      setRecall(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load recall detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecall();
  }, [recallId]);

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      await apiRequest(`/customer/recalls/${recallId}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Customer read safety notice' }),
      });
      fetchRecall();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge notice');
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Loading safety notice details...</div>;
  if (error || !recall) return <div className="py-12 text-center text-red-500">{error || 'Recall notice not found'}</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{recall.title}</h1>
            <Badge tone="danger">{recall.severity} SEVERITY</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Ref #: {recall.publicReferenceNumber} &bull; Issued by {recall.businessName}
          </p>
        </div>
        {!recall.acknowledgedAt && (
          <Button variant="primary" onClick={handleAcknowledge} disabled={acknowledging}>
            {acknowledging ? 'Confirming...' : 'Acknowledge & Read Safety Notice'}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <Card className="p-6 bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-300 mb-2">Affected Product in Your Wallet</h2>
          <div className="text-sm space-y-1">
            <div><span className="font-semibold">Product Name:</span> {recall.affectedProduct.name}</div>
            {recall.affectedProduct.modelNumber && <div><span className="font-semibold">Model Number:</span> {recall.affectedProduct.modelNumber}</div>}
            {recall.affectedProduct.serialNumber && <div><span className="font-semibold">Serial Number:</span> <code className="font-mono">{recall.affectedProduct.serialNumber}</code></div>}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
            Safety Warning & Issue Summary
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{recall.description}</p>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b pb-2 dark:border-slate-800">
            Required Customer Action & Servicing Instructions
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{recall.customerInstructions}</p>
          <div className="mt-4 border-t pt-4 border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Support Contact: {recall.businessContact.phone || recall.businessContact.email || 'Contact issuing merchant'}
          </div>
        </Card>
      </div>
    </div>
  );
}
