'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { IssuedWarrantyDto } from '@warrantypass/shared';
import { Button, Card, Input, Badge } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function BusinessWarrantiesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [warranties, setWarranties] = useState<IssuedWarrantyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchWarranties = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<IssuedWarrantyDto[]>(`/business/warranties${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setWarranties(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load warranties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, [businessId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWarranties();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Issued Business Warranties</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track and manage all digital warranties issued by your business.
          </p>
        </div>
        <Link href={`/business/${businessId}/warranties/issue`}>
          <Button variant="primary">+ Issue Verified Warranty</Button>
        </Link>
      </div>

      <Card className="mb-6 p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <Input
            placeholder="Search by warranty number, serial number, customer email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading warranties...</div>
      ) : warranties.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          No warranties issued yet. Click &quot;Issue Verified Warranty&quot; to issue your first customer warranty.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3">Warranty #</th>
                <th className="p-3">Product</th>
                <th className="p-3">Serial #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Status</th>
                <th className="p-3">End Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {warranties.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">
                    {w.warrantyNumber}
                  </td>
                  <td className="p-3">{w.productName}</td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{w.serialNumber}</td>
                  <td className="p-3">
                    <div>{w.customerName || 'Customer'}</div>
                    <div className="text-xs text-slate-500">{w.customerEmail}</div>
                  </td>
                  <td className="p-3">
                    <Badge tone={w.status === 'ACTIVE' ? 'success' : w.status === 'REVOKED' ? 'danger' : 'neutral'}>
                      {w.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">
                    {w.endDate ? new Date(w.endDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/business/${businessId}/warranties/${w.id}`}>
                      <Button variant="secondary" size="sm">
                        View / Manage
                      </Button>
                    </Link>
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
