'use client';

import type {
  CustomerProductListItemDto,
  CustomerWarrantyDetailDto,
  PaginatedDto,
} from '@warrantypass/shared';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Pagination,
  Select,
  Skeleton,
  StatusBadge,
} from '@warrantypass/ui';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { apiRequest } from '@/lib/api-client';

export function WalletList({ mode }: { mode: 'warranties' | 'products' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const parameters = searchParams.toString();
  const query = useQuery({
    queryKey: ['customer', mode, parameters],
    queryFn: () =>
      apiRequest<PaginatedDto<CustomerWarrantyDetailDto | CustomerProductListItemDto>>(
        `/customer/${mode}${parameters ? `?${parameters}` : ''}`,
      ),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && value) next.set(key, value);
    }
    router.push(`/dashboard/${mode}?${next.toString()}`);
  };
  return (
    <>
      <form
        onSubmit={submit}
        className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div className="flex gap-2">
          <FormField label="Search your wallet" htmlFor={`${mode}-search`} className="flex-1">
            <Input
              id={`${mode}-search`}
              name="search"
              defaultValue={searchParams.get('search') ?? ''}
              placeholder="Product, brand, model, serial, warranty number or seller"
            />
          </FormField>
          <Button className="mt-7" type="submit">
            <Search aria-hidden="true" size={17} /> Search
          </Button>
          <Button
            className="mt-7 lg:hidden"
            variant="secondary"
            onClick={() => setFiltersOpen((value) => !value)}
            aria-expanded={filtersOpen}
          >
            <Filter aria-hidden="true" size={17} />
            <span className="sr-only">Toggle filters</span>
          </Button>
        </div>
        <div
          className={`${filtersOpen ? 'grid' : 'hidden'} mt-4 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-4`}
        >
          <FormField label="Status" htmlFor={`${mode}-status`}>
            <Select
              id={`${mode}-status`}
              name="status"
              defaultValue={searchParams.get('status') ?? ''}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING_SOON">Expiring soon</option>
              <option value="EXPIRED">Expired</option>
              <option value="INVALID">Invalid</option>
              <option value="REVOKED">Revoked</option>
            </Select>
          </FormField>
          <FormField label="Verification" htmlFor={`${mode}-verification`}>
            <Select
              id={`${mode}-verification`}
              name="verificationStatus"
              defaultValue={searchParams.get('verificationStatus') ?? ''}
            >
              <option value="">All verification states</option>
              <option value="VERIFIED_BY_BUSINESS">Verified by Business</option>
              <option value="USER_UPLOADED">User Uploaded</option>
              <option value="VERIFICATION_PENDING">Verification pending</option>
            </Select>
          </FormField>
          <FormField label="Source" htmlFor={`${mode}-source`}>
            <Select
              id={`${mode}-source`}
              name="source"
              defaultValue={searchParams.get('source') ?? ''}
            >
              <option value="">All sources</option>
              <option value="BUSINESS_ISSUED">Business issued</option>
              <option value="USER_UPLOADED">User uploaded</option>
              <option value="PLATFORM_IMPORTED">Platform imported</option>
            </Select>
          </FormField>
          <FormField label="Sort by" htmlFor={`${mode}-sort`}>
            <Select
              id={`${mode}-sort`}
              name="sort"
              defaultValue={searchParams.get('sort') ?? 'recent'}
            >
              <option value="recent">Recently added</option>
              <option value="oldest">Oldest</option>
              <option value="endingSoon">Ending soon</option>
              <option value="endingLater">Ending later</option>
              <option value="productName">Product name</option>
              <option value="brand">Brand</option>
              <option value="purchaseDate">Purchase date</option>
            </Select>
          </FormField>
        </div>
      </form>
      {query.isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : query.isError ? (
        <div className="mt-6">
          <ErrorState
            title="Wallet unavailable"
            description="We could not load these records."
            actionLabel="Try again"
            onAction={() => void query.refetch()}
          />
        </div>
      ) : query.data?.items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<WalletCards aria-hidden="true" />}
            title="No matching records"
            description="Try clearing filters, or add a paper warranty through the Manual Warranty Vault."
          />
        </div>
      ) : query.data ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((item) => (
              <WalletCard key={item.id} mode={mode} item={item} />
            ))}
          </div>
          <div className="mt-6">
            <Pagination
              page={query.data.pagination.page}
              totalPages={query.data.pagination.totalPages}
              onPageChange={(page) => {
                const next = new URLSearchParams(searchParams);
                next.set('page', String(page));
                router.push(`/dashboard/${mode}?${next.toString()}`);
              }}
            />
          </div>
        </>
      ) : null}
    </>
  );
}

function WalletCard({
  mode,
  item,
}: {
  mode: 'warranties' | 'products';
  item: CustomerWarrantyDetailDto | CustomerProductListItemDto;
}) {
  const warranty = 'operationalStatus' in item ? item : item.warranty;
  const product = 'product' in item ? item.product : item;
  const status =
    warranty?.operationalStatus === 'EXPIRED'
      ? 'EXPIRED'
      : warranty?.operationalStatus === 'INVALID'
        ? 'INVALID'
        : warranty?.operationalStatus === 'REVOKED'
          ? 'REVOKED'
          : 'ACTIVE';
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[var(--text-subtle)] uppercase">
              {('brandName' in product ? product.brandName : product.brand?.name) ??
                'Brand not specified'}
            </p>
            <h2 className="mt-1 text-lg font-bold">{product.productName}</h2>
          </div>
          {warranty ? <StatusBadge status={status} /> : null}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[var(--text-subtle)]">Model</dt>
            <dd className="mt-1 font-medium">{product.modelNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-subtle)]">Serial</dt>
            <dd className="mt-1 font-medium">
              {'maskedSerialNumber' in product
                ? (product.maskedSerialNumber ?? '—')
                : 'Available on detail page'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-subtle)]">Warranty ends</dt>
            <dd className="mt-1 font-medium">{warranty?.endDate ?? 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-subtle)]">Verification</dt>
            <dd className="mt-1 font-medium">
              {warranty?.verificationStatus === 'VERIFIED_BY_BUSINESS'
                ? 'Verified by Business'
                : 'User Uploaded'}
            </dd>
          </div>
        </dl>
        <Link
          className="mt-5 inline-flex font-semibold text-[var(--primary)] hover:underline"
          href={`/dashboard/${mode}/${item.id}`}
        >
          View details<span aria-hidden="true"> →</span>
        </Link>
      </CardContent>
    </Card>
  );
}
