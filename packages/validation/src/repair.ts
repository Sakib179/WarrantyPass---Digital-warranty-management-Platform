import { z } from 'zod';

export const createRepairRecordSchema = z.object({
  customerProductId: z.string().uuid(),
  warrantyId: z.string().uuid().optional().nullable(),
  claimId: z.string().uuid().optional().nullable(),
  serviceCenterId: z.string().uuid(),
  technicianMemberId: z.string().uuid().optional().nullable(),
  reportedProblem: z.string().min(5, 'Reported problem description required'),
  diagnosis: z.string().optional().nullable(),
  workPerformed: z.string().optional().nullable(),
  partsReplaced: z.string().optional().nullable(),
  warrantyCoverageStatus: z.enum(['FULLY_COVERED', 'PARTIALLY_COVERED', 'NOT_COVERED', 'PENDING_DECISION']).default('PENDING_DECISION'),
  laborCostCents: z.number().int().nonnegative().default(0),
  partsCostCents: z.number().int().nonnegative().default(0),
  customerVisibleNote: z.string().optional().nullable(),
  internalNote: z.string().optional().nullable(),
});

export const updateRepairRecordSchema = createRepairRecordSchema.partial();

export const updateRepairStatusSchema = z.object({
  status: z.enum([
    'CREATED',
    'PRODUCT_RECEIVED',
    'DIAGNOSIS_IN_PROGRESS',
    'WAITING_FOR_APPROVAL',
    'WAITING_FOR_PARTS',
    'REPAIR_IN_PROGRESS',
    'QUALITY_CHECK',
    'READY_FOR_COLLECTION',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'UNREPAIRABLE',
  ]),
  customerVisibleNote: z.string().optional().nullable(),
  internalNote: z.string().optional().nullable(),
});

export const assignTechnicianSchema = z.object({
  technicianMemberId: z.string().uuid().optional().nullable(),
});

export type CreateRepairRecordInput = z.infer<typeof createRepairRecordSchema>;
export type UpdateRepairRecordInput = z.infer<typeof updateRepairRecordSchema>;
export type UpdateRepairStatusInput = z.infer<typeof updateRepairStatusSchema>;
export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>;
