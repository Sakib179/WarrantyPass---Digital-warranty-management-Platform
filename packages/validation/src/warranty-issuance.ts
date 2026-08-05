import { z } from 'zod';
import { uuidSchema } from './common.js';

export const issueWarrantySchema = z.object({
  customerEmail: z.string().email('Valid customer email is required').max(254),
  customerName: z.string().max(160).optional().nullable(),
  customerPhone: z.string().max(32).optional().nullable(),
  productId: uuidSchema,
  templateId: uuidSchema.optional().nullable(),
  serialNumber: z.string().min(1, 'Serial number is required').max(180),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  startDate: z.string().optional().nullable(),
  durationValue: z.number().int().positive('Duration value must be positive'),
  durationUnit: z.enum(['DAYS', 'MONTHS', 'YEARS']),
  coverageType: z.enum([
    'MANUFACTURER',
    'SELLER',
    'LIMITED',
    'EXTENDED',
    'SERVICE_ONLY',
    'OTHER',
  ]),
  termsSummary: z.string().min(1, 'Terms summary is required'),
  invoiceNumber: z.string().max(120).optional().nullable(),
  sellerName: z.string().max(180).optional().nullable(),
  documentStorageKeys: z.array(z.string().max(500)).optional().default([]),
  idempotencyKey: z.string().max(180).optional().nullable(),
});

export const correctWarrantySchema = z.object({
  reason: z.string().min(3, 'Correction reason is required').max(500),
  customerName: z.string().max(160).optional().nullable(),
  customerPhone: z.string().max(32).optional().nullable(),
  serialNumber: z.string().max(180).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  termsSummary: z.string().optional().nullable(),
  warrantyNumber: z.string().max(120).optional().nullable(),
});

export const revokeWarrantySchema = z.object({
  reason: z.string().min(3, 'Revocation reason is required').max(500),
  confirm: z.literal(true),
});

export type IssueWarrantyInput = z.infer<typeof issueWarrantySchema>;
export type CorrectWarrantyInput = z.infer<typeof correctWarrantySchema>;
export type RevokeWarrantyInput = z.infer<typeof revokeWarrantySchema>;
