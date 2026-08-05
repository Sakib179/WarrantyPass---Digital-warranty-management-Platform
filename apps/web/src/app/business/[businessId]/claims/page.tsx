'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { BusinessClaimDetailDto, PaginatedDto } from '@warrantypass/shared';
import { Button, Card, Input, Select, Badge } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function BusinessClaimsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [claims, setClaims] = useState<BusinessClaimDetailDto[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchClaims = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });
      const data = await apiRequest<PaginatedDto<BusinessClaimDetailDto>>(`/business/claims?${query.toString()}`);
      setClaims(data.items);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims(1);
  }, [businessId, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClaims(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge tone="warning">Submitted</Badge>;
      case 'UNDER_REVIEW':
        return <Badge tone="info">Under Review</Badge>;
      case 'MORE_INFORMATION_REQUIRED':
        return <Badge tone="warning">Action Required</Badge>;
      case 'APPROVED':
      case 'RESOLVED':
        return <Badge tone="success">{status}</Badge>;
      case 'REJECTED':
      case 'CANCELLED':
        return <Badge tone="danger">{status}</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Warranty Claims Review Center</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Review submitted warranty claims, update repair status, assign staff, and communicate with customers.
          </p>
        </div>
      </div>

      <Card className="mb-6 p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by claim #, subject, customer email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sm:max-w-xs"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="MORE_INFORMATION_REQUIRED">More Info Required</option>
            <option value="APPROVED">Approved</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PRODUCT_RECEIVED">Product Received</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="READY_FOR_COLLECTION">Ready for Collection</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Button type="submit" variant="secondary">
            Filter Claims
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading claims...</div>
      ) : claims.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          No warranty claims match the current filters.
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="p-3">Claim #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Warranty & Product</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Assigned Staff</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {claims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">
                      {c.referenceNumber}
                    </td>
                    <td className="p-3">
                      <div>{c.customer.name}</div>
                      <div className="text-xs text-slate-500">{c.customer.email}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{c.warranty.productName}</div>
                      <div className="text-xs text-slate-500 font-mono">{c.warranty.warrantyNumber}</div>
                    </td>
                    <td className="p-3 max-w-xs truncate">{c.subject}</td>
                    <td className="p-3">{getStatusBadge(c.status)}</td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                      {c.assignedMember ? c.assignedMember.name : 'Unassigned'}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(c.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/business/${businessId}/claims/${c.id}`}>
                        <Button variant="secondary" size="sm">
                          Review Claim
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4 border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchClaims(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchClaims(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
