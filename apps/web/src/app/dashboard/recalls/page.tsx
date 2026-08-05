'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Badge } from '@warrantypass/ui';
import { apiRequest } from '../../../lib/api-client.js';

interface CustomerRecallItem {
  id: string;
  publicReferenceNumber: string;
  title: string;
  businessName: string;
  severity: string;
  noticeType: string;
  productName: string;
  modelNumber: string | null;
  publishedAt: string | null;
  acknowledgedAt: string | null;
}

export default function CustomerRecallsPage() {
  const [recalls, setRecalls] = useState<CustomerRecallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecalls = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<CustomerRecallItem[]>('/customer/recalls');
      setRecalls(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load safety alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecalls();
  }, []);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <Badge tone="danger">⚠️ {severity} SEVERITY</Badge>;
      case 'MEDIUM':
        return <Badge tone="warning">{severity}</Badge>;
      default:
        return <Badge tone="neutral">{severity}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Recall & Safety Notices</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Targeted product safety warnings, recall instructions, software updates, and campaign alerts for your verified products.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Checking product safety registry...</div>
      ) : recalls.length === 0 ? (
        <Card className="py-12 text-center p-6 text-slate-500">
          <p className="font-semibold text-slate-700 dark:text-slate-300">No active recall or safety notices for your products.</p>
          <p className="text-xs text-slate-400 mt-1">All registered products in your digital wallet are currently in good standing.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {recalls.map((r) => (
            <Card key={r.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-amber-500">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs font-semibold text-slate-500">{r.publicReferenceNumber}</span>
                  {getSeverityBadge(r.severity)}
                  <Badge tone="info">{r.noticeType.replace(/_/g, ' ')}</Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{r.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Affected Product: <span className="font-semibold">{r.productName}</span> &bull; Merchant: {r.businessName}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {r.acknowledgedAt && (
                  <span className="text-xs text-emerald-600 font-medium dark:text-emerald-400">✓ Read</span>
                )}
                <Link href={`/dashboard/recalls/${r.id}`}>
                  <Button variant="secondary" size="sm">
                    View Safety Instructions
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
