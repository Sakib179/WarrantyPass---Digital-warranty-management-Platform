'use client';

import type {
  CatalogOptionDto,
  CustomerProductDetailDto,
  CustomerSubscriptionDto,
  DocumentExtractionDto,
} from '@warrantypass/shared';
import { manualProductCreateSchema } from '@warrantypass/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Select,
  Textarea,
} from '@warrantypass/ui';
import { FileScan, LockKeyhole, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { apiRequest } from '@/lib/api-client';

type FormValues = z.input<typeof manualProductCreateSchema>;

export function ManualVaultForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [warrantyFile, setWarrantyFile] = useState<File>();
  const [invoiceFile, setInvoiceFile] = useState<File>();
  const [extraction, setExtraction] = useState<DocumentExtractionDto>();
  const subscription = useQuery({
    queryKey: ['customer-subscription'],
    queryFn: () => apiRequest<CustomerSubscriptionDto>('/customer/subscription'),
  });
  const product = useQuery({
    queryKey: ['customer-product', productId],
    queryFn: () => apiRequest<CustomerProductDetailDto>(`/customer/products/${productId}`),
    enabled: Boolean(productId),
  });
  const categories = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: () => apiRequest<CatalogOptionDto[]>('/catalog/categories'),
  });
  const brands = useQuery({
    queryKey: ['catalog-brands'],
    queryFn: () => apiRequest<CatalogOptionDto[]>('/catalog/brands'),
  });
  const defaults = useMemo<FormValues>(() => {
    const current = product.data;
    const warranty = current?.warranties[0];
    return current
      ? {
          productName: current.productName,
          brandId: current.brand?.id,
          categoryId: current.category.id,
          modelNumber: current.modelNumber ?? '',
          serialNumber: current.serialNumber ?? '',
          purchaseDate: current.purchaseDate,
          sellerName: current.sellerName,
          nickname: current.nickname ?? '',
          notes: current.notes ?? '',
          warrantyNumber: warranty?.warrantyNumber ?? '',
          warrantyStartDate: warranty?.startDate ?? current.purchaseDate,
          warrantyEndDate: warranty?.endDate ?? '',
          warrantyDurationValue: warranty?.durationValue ?? undefined,
          warrantyDurationUnit: warranty?.durationUnit ?? undefined,
          coverageType: warranty?.coverageType ?? undefined,
          termsSummary: warranty?.termsSummary ?? '',
        }
      : {
          productName: '',
          categoryId: '',
          purchaseDate: '',
          sellerName: '',
          warrantyStartDate: '',
          warrantyDurationUnit: 'YEARS',
        };
  }, [product.data]);
  const form = useForm<FormValues>({
    resolver: zodResolver(manualProductCreateSchema),
    values: defaults,
  });
  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = manualProductCreateSchema.parse(values);
      if (productId) {
        await apiRequest(`/customer/manual-products/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        return productId;
      }
      const created = await apiRequest<{ productId: string }>('/customer/manual-products', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      for (const [file, kind] of [
        [warrantyFile, 'WARRANTY_CARD'],
        [invoiceFile, 'INVOICE'],
      ] as const) {
        if (!file) continue;
        const data = new FormData();
        data.set('kind', kind);
        data.set('document', file);
        await apiRequest(`/customer/manual-products/${created.productId}/documents`, {
          method: 'POST',
          body: data,
        });
      }
      return created.productId;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['customer'] });
      router.push(`/dashboard/products/${id}`);
    },
  });
  const scan = async (file: File) => {
    const data = new FormData();
    data.set('document', file);
    const result = await apiRequest<DocumentExtractionDto>('/customer/document-extraction', {
      method: 'POST',
      body: data,
    });
    setExtraction(result);
    for (const [name, extracted] of Object.entries(result.fields)) {
      if (extracted) form.setValue(name as keyof FormValues, extracted.value);
    }
  };
  if (subscription.isLoading || (productId && product.isLoading))
    return <p className="mt-8 text-[var(--text-muted)]">Loading secure vault…</p>;
  if (!productId && !subscription.data?.entitled) return <Paywall />;
  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        void form.handleSubmit((values) => save.mutate(values))(event);
      }}
    >
      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Form progress">
        {['Product', 'Warranty', 'Documents & review'].map((label, index) => (
          <li
            key={label}
            className={`rounded-xl border p-3 text-center text-sm font-semibold ${step === index + 1 ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-strong)]' : 'border-[var(--border)]'}`}
            aria-current={step === index + 1 ? 'step' : undefined}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Product information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field form={form} name="productName" label="Product name" required />
            <FormField label="Brand" htmlFor="brandId">
              <Select id="brandId" {...form.register('brandId')}>
                <option value="">Brand not listed</option>
                {brands.data?.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Category"
              htmlFor="categoryId"
              required
              error={form.formState.errors.categoryId?.message}
            >
              <Select id="categoryId" {...form.register('categoryId')}>
                <option value="">Choose category</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <Field form={form} name="modelNumber" label="Model number" />
            <Field form={form} name="serialNumber" label="Serial number" />
            <Field form={form} name="purchaseDate" label="Purchase date" type="date" required />
            <Field form={form} name="sellerName" label="Seller name" required />
            <Field form={form} name="nickname" label="Nickname" />
          </CardContent>
        </Card>
      ) : null}
      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Warranty information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field form={form} name="warrantyNumber" label="Warranty number" />
            <Field
              form={form}
              name="warrantyStartDate"
              label="Warranty start date"
              type="date"
              required
            />
            <Field form={form} name="warrantyEndDate" label="Warranty end date" type="date" />
            <Field form={form} name="warrantyDurationValue" label="Duration" type="number" />
            <FormField label="Duration unit" htmlFor="durationUnit">
              <Select id="durationUnit" {...form.register('warrantyDurationUnit')}>
                <option value="DAYS">Days</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </Select>
            </FormField>
            <FormField label="Coverage type" htmlFor="coverageType">
              <Select id="coverageType" {...form.register('coverageType')}>
                <option value="">Not specified</option>
                <option value="MANUFACTURER">Manufacturer</option>
                <option value="SELLER">Seller</option>
                <option value="LIMITED">Limited</option>
                <option value="EXTENDED">Extended</option>
                <option value="SERVICE_ONLY">Service only</option>
                <option value="OTHER">Other</option>
              </Select>
            </FormField>
            <FormField className="sm:col-span-2" label="Notes" htmlFor="notes">
              <Textarea id="notes" {...form.register('notes')} />
            </FormField>
          </CardContent>
        </Card>
      ) : null}
      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Documents and review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Alert tone="info" title="User Uploaded — Not Verified by Business">
              This record will never be presented as verified by the original company. Review all
              scanned values before saving.
            </Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <UploadField label="Warranty card" onFile={setWarrantyFile} />
              <UploadField
                label="Invoice or receipt"
                onFile={(file) => {
                  setInvoiceFile(file);
                  void scan(file);
                }}
              />
            </div>
            {extraction ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <FileScan aria-hidden="true" />
                  Review extracted information
                </div>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{extraction.warning}</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(extraction.fields).map(([key, value]) =>
                    value ? (
                      <li key={key} className="text-sm">
                        <span className="text-[var(--text-subtle)]">{key}</span>: {value.value} (
                        {Math.round(value.confidence * 100)}%)
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            ) : null}
            <div>
              <h3 className="font-semibold">Before saving</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                WarrantyPass stores dates as date-only values, keeps documents private, and does not
                treat OCR output as verified evidence.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {save.isError ? (
        <Alert className="mt-4" tone="danger" title="Could not save">
          {save.error.message}
        </Alert>
      ) : null}
      <div className="mt-6 flex justify-between">
        <Button
          variant="secondary"
          disabled={step === 1 || save.isPending}
          onClick={() => setStep((value) => value - 1)}
        >
          Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep((value) => value + 1)}>Continue</Button>
        ) : (
          <Button type="submit" disabled={save.isPending}>
            {save.isPending
              ? 'Saving securely…'
              : productId
                ? 'Save changes'
                : 'Save manual warranty'}
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  form,
  name,
  label,
  type = 'text',
  required,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  name: keyof FormValues;
  label: string;
  type?: string;
  required?: boolean;
}) {
  const error = form.formState.errors[name];
  return (
    <FormField
      label={label}
      htmlFor={String(name)}
      {...(required !== undefined ? { required } : {})}
      {...(typeof error?.message === 'string' ? { error: error.message } : {})}
    >
      <Input id={String(name)} type={type} {...form.register(name)} />
    </FormField>
  );
}

function UploadField({ label, onFile }: { label: string; onFile: (file: File) => void }) {
  return (
    <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] p-5 text-center focus-within:ring-2 focus-within:ring-[var(--focus-ring)]">
      <Upload aria-hidden="true" className="text-[var(--primary)]" />
      <span className="mt-2 font-semibold">{label}</span>
      <span className="mt-1 text-xs text-[var(--text-subtle)]">
        JPEG, PNG, WebP or PDF · maximum 10 MB
      </span>
      <input
        className="sr-only"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function Paywall() {
  return (
    <Card className="mt-6">
      <CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <LockKeyhole aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-2xl font-bold">Manual Warranty Vault Annual required</h2>
        <p className="mt-3 max-w-lg text-[var(--text-muted)]">
          Business-issued warranties remain free to view. Subscribe annually to create manual
          records and upload private warranty papers or invoices.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-5 font-semibold text-white"
          href="/dashboard/subscription"
        >
          View annual plan
        </Link>
      </CardContent>
    </Card>
  );
}
