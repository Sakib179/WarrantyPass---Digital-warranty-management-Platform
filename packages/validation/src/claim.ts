import { z } from 'zod';
import { uuidSchema } from './common.js';

export const claimStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'APPROVED',
  'REJECTED',
  'ASSIGNED',
  'PRODUCT_RECEIVED',
  'IN_PROGRESS',
  'READY_FOR_COLLECTION',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]);

export const submitClaimSchema = z.object({
  warrantyId: uuidSchema,
  subject: z.string().min(3, 'Problem title must be at least 3 characters').max(180),
  description: z.string().min(10, 'Detailed description is required').max(5000),
  problemStartDate: z.string().optional().nullable(),
  productCondition: z.string().max(120).optional().nullable(),
  preferredContactMethod: z.string().max(60).optional().nullable(),
  customerPhone: z.string().max(32).optional().nullable(),
  preferredServiceLocation: z.string().max(220).optional().nullable(),
  attachmentStorageKeys: z.array(z.string().max(500)).optional().default([]),
});

export const updateClaimStatusSchema = z.object({
  status: claimStatusSchema,
  publicNote: z.string().max(2000).optional().nullable(),
  internalNote: z.string().max(2000).optional().nullable(),
  rejectionCategory: z.string().max(80).optional().nullable(),
  rejectionReason: z.string().max(1000).optional().nullable(),
  moreInfoRequestedNotes: z.string().max(1000).optional().nullable(),
  moreInfoDeadline: z.string().optional().nullable(),
});

export const assignClaimSchema = z.object({
  assignedBusinessMemberId: uuidSchema.nullable(),
  reason: z.string().max(500).optional().nullable(),
});

export const postClaimMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(3000),
  isInternalNote: z.boolean().default(false),
  attachmentStorageKeys: z.array(z.string().max(500)).optional().default([]),
});

export const cancelClaimSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required').max(500),
});

export type SubmitClaimInput = z.infer<typeof submitClaimSchema>;
export type UpdateClaimStatusInput = z.infer<typeof updateClaimStatusSchema>;
export type AssignClaimInput = z.infer<typeof assignClaimSchema>;
export type PostClaimMessageInput = z.infer<typeof postClaimMessageSchema>;
export type CancelClaimInput = z.infer<typeof cancelClaimSchema>;
