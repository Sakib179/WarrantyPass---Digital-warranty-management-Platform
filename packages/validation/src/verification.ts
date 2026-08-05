import { z } from 'zod';

export const verifyWarrantySchema = z.object({
  warrantyNumber: z.string().min(3, 'Warranty number required'),
  serialNumber: z.string().optional(),
  verificationCode: z.string().optional(),
});

export type VerifyWarrantyInput = z.infer<typeof verifyWarrantySchema>;
