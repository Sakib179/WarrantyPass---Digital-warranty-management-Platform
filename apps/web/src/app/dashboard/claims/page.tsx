'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CustomerClaimListItemDto } from '@warrantypass/shared';
import { Button, Card, Badge } from '@warrantypass/ui';
import { apiRequest } from '../../../lib/api-client.js';

export default function CustomerClaimsPage() {
  const [claims, setClaims] = useState<CustomerClaimListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<CustomerClaimListItemDto[]>('/customer/claims');
      setClaims(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const getStatusBadge = (status: string, requiresAction: boolean) => {
    if (requiresAction) {
      return <Badge tone="warning">Action Needed</Badge>;
    }
    switch (status) {
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return <Badge tone="info">{status}</Badge>;
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Warranty Claims</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Submit and monitor claims directly with verified issuing businesses.
          </p>
        </div>
        <Link href="/dashboard/claims/new">
          <Button variant="primary">+ Submit New Claim</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading your warranty claims...</div>
      ) : claims.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            You haven&apos;t filed any warranty claims yet.
          </p>
          <Link href="/dashboard/claims/new">
            <Button variant="primary">Submit First Claim</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {claims.map((claim) => (
            <Card key={claim.id} className="flex flex-col justify-between p-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-500">{claim.referenceNumber}</span>
                  {getStatusBadge(claim.status, claim.requiresAction)}
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{claim.subject}</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {claim.productName} &bull; {claim.businessName}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t pt-4 border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Submitted {new Date(claim.submittedAt).toLocaleDateString()}</span>
                <Link href={`/dashboard/claims/${claim.id}`}>
                  <Button variant="secondary" size="sm">
                    View Details
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
