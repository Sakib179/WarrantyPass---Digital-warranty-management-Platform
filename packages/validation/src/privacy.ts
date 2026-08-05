import { z } from 'zod';

export const createPrivacyRequestSchema = z.object({
  requestType: z.enum(['EXPORT_DATA', 'DELETE_ACCOUNT', 'DEACTIVATE_ACCOUNT']),
  reason: z.string().optional(),
});

export type CreatePrivacyRequestInput = z.infer<typeof createPrivacyRequestSchema>;
