'use client';

import type {
  CustomerProductListItemDto,
  CustomerSubscriptionDto,
  PaginatedDto,
} from '@warrantypass/shared';
import {
  Alert,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
} from '@warrantypass/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderLock } from 'lucide-react';
import Link from 'next/link';

import { apiRequest } from '@/lib/api-client';

export function ManualVaultOverview() {
  const queryClient = useQueryClient();
  const records = useQuery({
    queryKey: ['manual-vault-records'],
    queryFn: () =>
      apiRequest<PaginatedDto<CustomerProductListItemDto>>(
        '/customer/products?source=USER_UPLOADED&pageSize=50',
      ),
  });
  const subscription = useQuery({
    queryKey: ['customer-subscription'],
    queryFn: () => apiRequest<CustomerSubscriptionDto>('/customer/subscription'),
  });
  const archive = useMutation({
    mutationFn: (id: string) => apiRequest(`/customer/manual-products/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['manual-vault-records'] });
      await queryClient.invalidateQueries({ queryKey: ['customer'] });
    },
  });
  if (records.isLoading || subscription.isLoading) return <Skeleton className="mt-6 h-72" />;
  if (records.isError || subscription.isError)
    return (
      <div className="mt-6">
        <ErrorState
          title="Vault unavailable"
          description="We could not load your private records."
        />
      </div>
    );
  return (
    <>
      {!subscription.data?.entitled ? (
        <Alert className="mt-6" tone="warning" title="Your vault is read-only">
          Existing manual records and documents remain available. Renew the annual plan to add
          records or upload documents.
        </Alert>
      ) : null}
      <div className="mt-6 flex justify-end">
        {subscription.data?.entitled ? (
          <Link
            className="inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-4 font-semibold text-white"
            href="/dashboard/manual-vault/new"
          >
            Add manual warranty
          </Link>
        ) : (
          <Link
            className="font-semibold text-[var(--primary)] hover:underline"
            href="/dashboard/subscription"
          >
            Renew annual access
          </Link>
        )}
      </div>
      {records.data?.items.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {records.data.items.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-5">
                <div className="flex justify-between gap-3">
                  <h2 className="font-bold">{record.productName}</h2>
                  <StatusBadge status="USER_UPLOADED" />
                </div>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {record.sellerName} · purchased {record.purchaseDate}
                </p>
                <p className="mt-3 text-xs font-semibold text-[var(--info-text)]">
                  User Uploaded — Not Verified by Business
                </p>
                <div className="mt-5 flex gap-4">
                  <Link
                    className="font-semibold text-[var(--primary)] hover:underline"
                    href={`/dashboard/products/${record.id}`}
                  >
                    View
                  </Link>
                  {subscription.data?.entitled ? (
                    <>
                      <Link
                        className="font-semibold text-[var(--primary)] hover:underline"
                        href={`/dashboard/manual-vault/${record.id}/edit`}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="font-semibold text-[var(--danger)] hover:underline"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Archive this manual warranty? It will leave active wallet views, but retained documents are not destroyed.',
                            )
                          ) {
                            archive.mutate(record.id);
                          }
                        }}
                      >
                        Archive
                      </button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={<FolderLock aria-hidden="true" />}
            title="No manual warranties yet"
            description="Save warranty cards from shops and companies that are not connected to WarrantyPass."
          />
        </div>
      )}
    </>
  );
}
