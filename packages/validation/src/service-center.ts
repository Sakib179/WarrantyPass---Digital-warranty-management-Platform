import { z } from 'zod';

export const createServiceCenterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(160),
  serviceCenterCode: z.string().min(2, 'Code must be at least 2 characters').max(50),
  phone: z.string().min(6, 'Phone number must be at least 6 characters').max(40),
  email: z.string().email('Invalid email address').optional().nullable(),
  addressLine: z.string().min(3, 'Address line required').max(255),
  area: z.string().min(2, 'Area required').max(100),
  district: z.string().min(2, 'District required').max(100),
  division: z.string().min(2, 'Division required').max(100),
  postalCode: z.string().max(20).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  openingHours: z.string().min(3, 'Opening hours required'),
  serviceInstructions: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'TEMPORARILY_CLOSED', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
  supportedCategoryIds: z.array(z.string().uuid()).optional(),
  supportedBrandIds: z.array(z.string().uuid()).optional(),
});

export const updateServiceCenterSchema = createServiceCenterSchema.partial();

export const assignClaimServiceCenterSchema = z.object({
  serviceCenterId: z.string().uuid('Invalid service center ID'),
  assignmentReason: z.string().optional(),
});

export type CreateServiceCenterInput = z.infer<typeof createServiceCenterSchema>;
export type UpdateServiceCenterInput = z.infer<typeof updateServiceCenterSchema>;
export type AssignClaimServiceCenterInput = z.infer<typeof assignClaimServiceCenterSchema>;
