import { z } from 'zod';

export const updateNotificationPreferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  claimUpdatesEnabled: z.boolean(),
  repairUpdatesEnabled: z.boolean(),
  transferUpdatesEnabled: z.boolean(),
  businessUpdatesEnabled: z.boolean(),
});

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z.enum(['true', 'false']).optional(),
  type: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>;
