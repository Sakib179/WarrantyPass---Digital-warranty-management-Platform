'use client';

import type { CustomerProductDetailDto, CustomerWarrantyDetailDto } from '@warrantypass/shared';
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Skeleton,
  StatusBadge,
} from '@warrantypass/ui';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, ShieldCheck } from 'lucide-react';

import { apiRequest, downloadPrivateFile } from '@/lib/api-client';

export function RecordDetail({ mode, id }: { mode: 'products' | 'warranties'; id: string }) {
  const query = useQuery({
    queryKey: ['customer', mode, id],
    queryFn: () =>
      apiRequest<CustomerProductDetailDto | CustomerWarrantyDetailDto>(`/customer/${mode}/${id}`),
  });
  if (query.isLoading)
    return (
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    );
  if (query.isError || !query.data)
    return (
      <div className="mt-6">
        <ErrorState
          title="Record unavailable"
          description="It may not exist or may belong to another account."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      </div>
    );
  const record = query.data;
  const isWarranty = (
    value: CustomerProductDetailDto | CustomerWarrantyDetailDto,
  ): value is CustomerWarrantyDetailDto => 'operationalStatus' in value;
  const warranty = isWarranty(record) ? record : record.warranties[0];
  const product = isWarranty(record) ? record.product : record;
  const serial = 'serialNumber' in product ? product.serialNumber : null;
  return (
    <>
      {warranty ? (
        <Alert
          className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          tone={warranty.verificationStatus === 'VERIFIED_BY_BUSINESS' ? 'success' : 'info'}
          title={
            warranty.verificationStatus === 'VERIFIED_BY_BUSINESS'
              ? 'Verified by Business'
              : 'User Uploaded — Not Verified by Business'
          }
          icon={<ShieldCheck aria-hidden="true" />}
        >
          <div>
            {warranty.verificationStatus === 'VERIFIED_BY_BUSINESS'
              ? 'This warranty was issued or confirmed by a verified WarrantyPass business.'
              : 'This information was added by the customer and has not been verified by the original company.'}{' '}
            Saving a warranty does not prove product authenticity.
          </div>
          {warranty.verificationStatus === 'VERIFIED_BY_BUSINESS' && warranty.operationalStatus === 'ACTIVE' && (
            <a
              href={`/dashboard/claims/new?warrantyId=${warranty.id}`}
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              File Warranty Claim
            </a>
          )}
        </Alert>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{product.productName}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Detail
                label="Brand"
                value={'brandName' in product ? product.brandName : product.brand?.name}
              />
              <Detail
                label="Category"
                value={'categoryName' in product ? product.categoryName : product.category.name}
              />
              <Detail label="Model" value={product.modelNumber} />
              <Detail label="Serial number" value={serial} />
              <Detail label="Purchase date" value={product.purchaseDate} />
              <Detail label="Seller" value={product.sellerName} />
              {warranty ? (
                <>
                  <Detail label="Warranty number" value={warranty.warrantyNumber} />
                  <Detail label="Start date" value={warranty.startDate} />
                  <Detail label="End date" value={warranty.endDate} />
                  <Detail
                    label="Remaining"
                    value={
                      warranty.remainingDays === null ? null : `${warranty.remainingDays} days`
                    }
                  />
                </>
              ) : null}
            </dl>
            {warranty?.termsSummary ? (
              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <h3 className="font-semibold">Coverage summary</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {warranty.termsSummary}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Warranty documents</CardTitle>
              {warranty ? (
                <StatusBadge
                  status={
                    warranty.operationalStatus === 'EXPIRED'
                      ? 'EXPIRED'
                      : warranty.operationalStatus === 'INVALID'
                        ? 'INVALID'
                        : warranty.operationalStatus === 'REVOKED'
                          ? 'REVOKED'
                          : 'ACTIVE'
                  }
                />
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {warranty?.documents.length ? (
              <ul className="space-y-3">
                {warranty.documents.map((document) => (
                  <li
                    key={document.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText aria-hidden="true" className="shrink-0 text-[var(--primary)]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{document.displayName}</p>
                        <p className="text-xs text-[var(--text-subtle)]">
                          {document.mimeType} · {Math.ceil(document.sizeBytes / 1024)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      className="rounded-lg p-2 hover:bg-[var(--surface-muted)]"
                      aria-label={`Open ${document.displayName}`}
                      onClick={() =>
                        void downloadPrivateFile(
                          `/customer/warranty-documents/${document.id}/access`,
                          document.displayName,
                        )
                      }
                    >
                      <Download aria-hidden="true" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                No documents are attached to this warranty.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-[var(--text-subtle)]">{label}</dt>
      <dd className="mt-1 font-semibold">{value || 'Not specified'}</dd>
    </div>
  );
}
