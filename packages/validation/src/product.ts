import { z } from 'zod';
import { uuidSchema } from './common.js';

export const productStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);
export const durationUnitSchema = z.enum(['DAYS', 'MONTHS', 'YEARS']);
export const coverageTypeSchema = z.enum([
  'MANUFACTURER',
  'SELLER',
  'LIMITED',
  'EXTENDED',
  'SERVICE_ONLY',
  'OTHER',
]);

export const createProductSchema = z.object({
  brandId: uuidSchema.optional().nullable(),
  categoryId: uuidSchema,
  name: z.string().min(1, 'Product name is required').max(180),
  modelNumber: z.string().max(120).optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  productImageFileId: z.string().max(500).optional().nullable(),
  defaultWarrantyDuration: z.number().int().positive().optional().nullable(),
  defaultWarrantyDurationUnit: durationUnitSchema.optional().nullable(),
  defaultCoverageType: coverageTypeSchema.optional().nullable(),
  status: productStatusSchema.default('ACTIVE'),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
