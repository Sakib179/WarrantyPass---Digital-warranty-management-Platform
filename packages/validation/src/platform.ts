import { z } from 'zod';

export const reviewClaimSchema = z.object({
  internalNote: z.string().trim().min(3).max(2_000),
});

export const approveBusinessSchema = z.object({
  reviewerNote: z.string().trim().min(5).max(2_000),
});

export const requestMoreInformationSchema = z.object({
  userVisibleReason: z.string().trim().min(10).max(2_000),
  internalNote: z.string().trim().min(3).max(2_000),
});

export const rejectBusinessSchema = z.object({
  category: z.string().trim().min(2).max(80),
  userVisibleReason: z.string().trim().min(10).max(2_000),
  internalNote: z.string().trim().min(3).max(2_000),
});

export const suspendBusinessSchema = z.object({
  userVisibleReason: z.string().trim().min(10).max(2_000),
  internalNote: z.string().trim().min(3).max(2_000),
});
