import { z } from 'zod';

export const createRecallNoticeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  noticeType: z.enum([
    'SAFETY_WARNING',
    'PRODUCT_RECALL',
    'FREE_REPLACEMENT',
    'SOFTWARE_UPDATE',
    'INSPECTION_REQUIRED',
    'SERVICE_CAMPAIGN',
  ]).default('SAFETY_WARNING'),
  description: z.string().min(10, 'Detailed description required'),
  customerInstructions: z.string().min(10, 'Customer instructions required'),
  affectedBrandId: z.string().uuid().optional().nullable(),
  affectedModelNumbers: z.array(z.string()).min(1, 'At least one affected model number is required'),
  affectedSerialNumberRanges: z.string().optional().nullable(),
  affectedPurchaseStart: z.string().optional().nullable(),
  affectedPurchaseEnd: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export const updateRecallNoticeSchema = createRecallNoticeSchema.partial();

export const acknowledgeRecallSchema = z.object({
  notes: z.string().optional(),
});

export type CreateRecallNoticeInput = z.infer<typeof createRecallNoticeSchema>;
export type UpdateRecallNoticeInput = z.infer<typeof updateRecallNoticeSchema>;
export type AcknowledgeRecallInput = z.infer<typeof acknowledgeRecallSchema>;
