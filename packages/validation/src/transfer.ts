import { z } from 'zod';

export const initiateTransferSchema = z.object({
  customerProductId: z.string().uuid('Invalid product ID'),
  recipientEmail: z.string().email('Invalid recipient email address'),
  note: z.string().optional(),
});

export const respondTransferSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export const businessReviewTransferSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export const updateBusinessTransferPolicySchema = z.object({
  isTransferAllowed: z.boolean(),
  requireBusinessApproval: z.boolean(),
  maxTransfersPerWarranty: z.number().int().min(1).max(20),
  minRemainingDaysRequired: z.number().int().min(0).max(365),
  transferRepairHistoryAllowed: z.boolean(),
});

export type InitiateTransferInput = z.infer<typeof initiateTransferSchema>;
export type RespondTransferInput = z.infer<typeof respondTransferSchema>;
export type BusinessReviewTransferInput = z.infer<typeof businessReviewTransferSchema>;
export type UpdateBusinessTransferPolicyInput = z.infer<typeof updateBusinessTransferPolicySchema>;
