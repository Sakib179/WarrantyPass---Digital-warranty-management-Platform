import { z } from 'zod';
import { uuidSchema } from './common.js';

export const templateStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);

export const createWarrantyTemplateSchema = z.object({
  productId: uuidSchema.optional().nullable(),
  name: z.string().min(1, 'Template name is required').max(180),
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
  termsDocumentFileId: z.string().max(500).optional().nullable(),
  exclusions: z.string().max(2000).optional().nullable(),
  serviceInstructions: z.string().max(2000).optional().nullable(),
  status: templateStatusSchema.default('ACTIVE'),
});

export const updateWarrantyTemplateSchema = createWarrantyTemplateSchema.partial();

export type CreateWarrantyTemplateInput = z.infer<typeof createWarrantyTemplateSchema>;
export type UpdateWarrantyTemplateInput = z.infer<typeof updateWarrantyTemplateSchema>;
