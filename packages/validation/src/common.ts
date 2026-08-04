import { z } from 'zod';

export const uuidSchema = z.uuid('A valid identifier is required');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const nonEmptySearchSchema = z.string().trim().min(1).max(100);
