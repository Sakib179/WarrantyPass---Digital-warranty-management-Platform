import { z } from 'zod';

export const adminUserActionSchema = z.object({
  action: z.enum(['SUSPEND', 'RESTORE', 'REVOKE_SESSIONS', 'TRIGGER_PASSWORD_RESET']),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

export const adminBusinessActionSchema = z.object({
  action: z.enum(['SUSPEND', 'RESTORE', 'VERIFY', 'REJECT']),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

export const adminSubscriptionOverrideSchema = z.object({
  planKey: z.string().min(2),
  status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'SUSPENDED']),
  currentPeriodEnd: z.string().datetime(),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

export const adminUpdateSystemSettingSchema = z.object({
  key: z.string().min(2),
  value: z.any(),
  description: z.string().optional(),
});

export const adminUpdateFeatureFlagSchema = z.object({
  key: z.string().min(2),
  isEnabled: z.boolean(),
  description: z.string().optional(),
});

export const adminResolveSecurityEventSchema = z.object({
  resolutionNote: z.string().min(3, 'Resolution note required'),
});

export type AdminUserActionInput = z.infer<typeof adminUserActionSchema>;
export type AdminBusinessActionInput = z.infer<typeof adminBusinessActionSchema>;
export type AdminSubscriptionOverrideInput = z.infer<typeof adminSubscriptionOverrideSchema>;
export type AdminUpdateSystemSettingInput = z.infer<typeof adminUpdateSystemSettingSchema>;
export type AdminUpdateFeatureFlagInput = z.infer<typeof adminUpdateFeatureFlagSchema>;
export type AdminResolveSecurityEventInput = z.infer<typeof adminResolveSecurityEventSchema>;
