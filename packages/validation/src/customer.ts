import {
  WARRANTY_OPERATIONAL_STATUSES,
  WARRANTY_SOURCES,
  WARRANTY_VERIFICATION_STATUSES,
} from '@warrantypass/shared';
import { z } from 'zod';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), 'Enter a valid date');
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const customerListQuerySchema = z.object({
  search: optionalText(120),
  status: z.enum(WARRANTY_OPERATIONAL_STATUSES).optional(),
  verificationStatus: z.enum(WARRANTY_VERIFICATION_STATUSES).optional(),
  source: z.enum(WARRANTY_SOURCES).optional(),
  brandId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  purchaseFrom: dateOnly.optional(),
  purchaseTo: dateOnly.optional(),
  endFrom: dateOnly.optional(),
  endTo: dateOnly.optional(),
  sort: z
    .enum(['recent', 'oldest', 'endingSoon', 'endingLater', 'productName', 'brand', 'purchaseDate'])
    .default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const catalogQuerySchema = z.object({
  search: optionalText(80),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

const manualFields = {
  productName: z.string().trim().min(2).max(180),
  brandId: z.uuid().optional(),
  categoryId: z.uuid(),
  modelNumber: optionalText(120),
  serialNumber: optionalText(180),
  purchaseDate: dateOnly,
  sellerName: z.string().trim().min(2).max(180),
  nickname: optionalText(120),
  notes: optionalText(2_000),
  warrantyNumber: optionalText(120),
  warrantyStartDate: dateOnly,
  warrantyEndDate: dateOnly.optional(),
  warrantyDurationValue: z.coerce.number().int().min(1).max(1_200).optional(),
  warrantyDurationUnit: z.enum(['DAYS', 'MONTHS', 'YEARS']).optional(),
  coverageType: z
    .enum(['MANUFACTURER', 'SELLER', 'LIMITED', 'EXTENDED', 'SERVICE_ONLY', 'OTHER'])
    .optional(),
  termsSummary: optionalText(4_000),
} as const;

export const manualProductCreateSchema = z
  .object(manualFields)
  .refine(
    (value) =>
      (!value.warrantyDurationValue && !value.warrantyDurationUnit) ||
      (Boolean(value.warrantyDurationValue) && Boolean(value.warrantyDurationUnit)),
    { message: 'Warranty duration value and unit must be provided together' },
  );

export const manualProductUpdateSchema = z.object(manualFields).partial();

export const documentKindSchema = z.object({
  kind: z.enum(['WARRANTY_CARD', 'INVOICE', 'RECEIPT', 'PRODUCT_IMAGE', 'OTHER']),
});

export const extractionConfirmSchema = z.object({
  fields: z
    .object({
      productName: optionalText(180),
      brand: optionalText(120),
      modelNumber: optionalText(120),
      serialNumber: optionalText(180),
      purchaseDate: dateOnly.optional(),
      invoiceNumber: optionalText(120),
      sellerName: optionalText(180),
      warrantyPeriod: optionalText(120),
    })
    .strict(),
});

export const subscriptionCheckoutSchema = z.object({
  planKey: z.literal('manual-vault-annual').default('manual-vault-annual'),
});

export const billingWebhookSchema = z.object({
  id: z.string().trim().min(1).max(180),
  type: z.enum(['subscription.activated', 'subscription.expired', 'payment.failed']),
  data: z.object({
    userId: z.uuid(),
    paymentReference: z.string().trim().min(1).max(120).optional(),
  }),
});

export type CustomerListQuery = z.output<typeof customerListQuerySchema>;
export type ManualProductCreateInput = z.output<typeof manualProductCreateSchema>;
export type ManualProductUpdateInput = z.output<typeof manualProductUpdateSchema>;
