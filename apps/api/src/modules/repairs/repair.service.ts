import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BusinessAuthorizationContext } from '../../common/security/contracts.js';
import { AppError } from '../../common/errors/app-error.js';
import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import type {
  CreateRepairRecordInput,
  UpdateRepairRecordInput,
  UpdateRepairStatusInput,
} from '@warrantypass/validation';

export class RepairService {
  public constructor(private readonly prisma: PrismaClient) {}

  private generateRepairNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RPR-${timestamp}-${random}`;
  }

  public async createRepair(auth: BusinessAuthorizationContext, input: CreateRepairRecordInput) {
    if (!auth.permissions.has(BUSINESS_PERMISSIONS.REPAIRS_CREATE) && !auth.isOwner) {
      throw new AppError({ code: 'BUSINESS_PERMISSION_DENIED', message: 'Permission denied', statusCode: 403 });
    }

    const center = await this.prisma.serviceCenter.findFirst({
      where: { id: input.serviceCenterId, businessId: auth.businessId, deletedAt: null },
    });

    if (!center) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid service center selected', statusCode: 400 });
    }

    const repairNumber = this.generateRepairNumber();

    const repair = await this.prisma.repairRecord.create({
      data: {
        repairNumber,
        customerProductId: input.customerProductId,
        warrantyId: input.warrantyId ?? null,
        claimId: input.claimId ?? null,
        businessId: auth.businessId,
        serviceCenterId: input.serviceCenterId,
        technicianMemberId: input.technicianMemberId ?? null,
        reportedProblem: input.reportedProblem,
        diagnosis: input.diagnosis ?? null,
        workPerformed: input.workPerformed ?? null,
        partsReplaced: input.partsReplaced ?? null,
        warrantyCoverageStatus: input.warrantyCoverageStatus,
        laborCostCents: input.laborCostCents,
        partsCostCents: input.partsCostCents,
        totalCostCents: input.laborCostCents + input.partsCostCents,
        currentStatus: 'CREATED',
        customerVisibleNote: input.customerVisibleNote ?? null,
        internalNote: input.internalNote ?? null,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: 'CREATED',
            changedByUserId: auth.userId,
            customerVisibleNote: input.customerVisibleNote ?? 'Repair record created',
            internalNote: input.internalNote ?? null,
          },
        },
      },
      include: {
        serviceCenter: true,
        customerProduct: true,
        statusHistory: true,
      },
    });

    return repair;
  }

  public async updateRepairStatus(
    auth: BusinessAuthorizationContext,
    repairId: string,
    input: UpdateRepairStatusInput
  ) {
    const repair = await this.prisma.repairRecord.findFirst({
      where: { id: repairId, businessId: auth.businessId },
    });

    if (!repair) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Repair record not found', statusCode: 404 });
    }

    const now = new Date();
    const updated = await this.prisma.repairRecord.update({
      where: { id: repairId },
      data: {
        currentStatus: input.status,
        customerVisibleNote: input.customerVisibleNote !== undefined ? input.customerVisibleNote : repair.customerVisibleNote,
        internalNote: input.internalNote !== undefined ? input.internalNote : repair.internalNote,
        ...(input.status === 'PRODUCT_RECEIVED' && !repair.receivedAt ? { receivedAt: now } : {}),
        ...(input.status === 'REPAIR_IN_PROGRESS' && !repair.repairStartedAt ? { repairStartedAt: now } : {}),
        ...(input.status === 'READY_FOR_COLLECTION' && !repair.completedAt ? { completedAt: now } : {}),
        ...(input.status === 'DELIVERED' && !repair.deliveredAt ? { deliveredAt: now } : {}),
        statusHistory: {
          create: {
            fromStatus: repair.currentStatus,
            toStatus: input.status,
            changedByUserId: auth.userId,
            customerVisibleNote: input.customerVisibleNote ?? null,
            internalNote: input.internalNote ?? null,
          },
        },
      },
      include: {
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    return updated;
  }

  public async updateRepairDetails(
    auth: BusinessAuthorizationContext,
    repairId: string,
    input: UpdateRepairRecordInput
  ) {
    const repair = await this.prisma.repairRecord.findFirst({
      where: { id: repairId, businessId: auth.businessId },
    });

    if (!repair) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Repair record not found', statusCode: 404 });
    }

    const labor = input.laborCostCents ?? repair.laborCostCents;
    const parts = input.partsCostCents ?? repair.partsCostCents;

    const updated = await this.prisma.repairRecord.update({
      where: { id: repairId },
      data: {
        ...(input.diagnosis !== undefined ? { diagnosis: input.diagnosis } : {}),
        ...(input.workPerformed !== undefined ? { workPerformed: input.workPerformed } : {}),
        ...(input.partsReplaced !== undefined ? { partsReplaced: input.partsReplaced } : {}),
        ...(input.warrantyCoverageStatus ? { warrantyCoverageStatus: input.warrantyCoverageStatus } : {}),
        laborCostCents: labor,
        partsCostCents: parts,
        totalCostCents: labor + parts,
        ...(input.customerVisibleNote !== undefined ? { customerVisibleNote: input.customerVisibleNote } : {}),
        ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
      },
    });

    return updated;
  }

  public async listBusinessRepairs(
    auth: BusinessAuthorizationContext,
    filters: { status?: string; serviceCenterId?: string }
  ) {
    const repairs = await this.prisma.repairRecord.findMany({
      where: {
        businessId: auth.businessId,
        ...(filters.status ? { currentStatus: filters.status as any } : {}),
        ...(filters.serviceCenterId ? { serviceCenterId: filters.serviceCenterId } : {}),
      },
      include: {
        serviceCenter: true,
        customerProduct: { select: { id: true, productName: true, customerUserId: true, customer: { select: { id: true, email: true, profile: true } } } },
        technician: { select: { id: true, user: { select: { id: true, email: true, profile: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return repairs.map((r: any) => ({
      ...r,
      serviceCenterName: r.serviceCenter.name,
      productName: r.customerProduct.productName,
      customerName: r.customerProduct.customer?.profile?.fullName || r.customerProduct.customer?.email || 'N/A',
      technicianName: r.technician?.user?.profile?.fullName || r.technician?.user?.email || null,
    }));
  }

  public async getBusinessRepairById(auth: BusinessAuthorizationContext, repairId: string) {
    const repair = await this.prisma.repairRecord.findFirst({
      where: { id: repairId, businessId: auth.businessId },
      include: {
        serviceCenter: true,
        customerProduct: { include: { customer: { select: { id: true, email: true, profile: true } } } },
        warranty: true,
        claim: true,
        technician: { include: { user: { include: { profile: true } } } },
        statusHistory: { include: { changedByUser: { select: { id: true, email: true, profile: true } } }, orderBy: { createdAt: 'desc' } },
        documents: true,
      },
    });

    if (!repair) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Repair record not found', statusCode: 404 });
    }

    return repair;
  }

  public async listCustomerRepairs(userId: string) {
    const repairs = await this.prisma.repairRecord.findMany({
      where: {
        customerProduct: { customerUserId: userId },
      },
      include: {
        serviceCenter: { select: { id: true, name: true, phone: true, addressLine: true, area: true, district: true } },
        customerProduct: { select: { id: true, productName: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return repairs.map((r) => ({
      id: r.id,
      repairNumber: r.repairNumber,
      productName: r.customerProduct.productName,
      businessName: r.business.name,
      serviceCenterName: r.serviceCenter.name,
      currentStatus: r.currentStatus,
      warrantyCoverageStatus: r.warrantyCoverageStatus,
      receivedAt: r.receivedAt?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
      totalCostCents: r.totalCostCents,
    }));
  }

  public async getCustomerRepairById(userId: string, repairId: string) {
    const repair = await this.prisma.repairRecord.findFirst({
      where: {
        id: repairId,
        customerProduct: { customerUserId: userId },
      },
      include: {
        serviceCenter: { select: { id: true, name: true, phone: true, email: true, addressLine: true, area: true, district: true, openingHours: true, serviceInstructions: true } },
        customerProduct: { select: { id: true, productName: true, modelNumber: true, serialNumber: true } },
        business: { select: { id: true, name: true } },
        statusHistory: { select: { id: true, fromStatus: true, toStatus: true, customerVisibleNote: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
        documents: { where: { isCustomerVisible: true } },
      },
    });

    if (!repair) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Repair record not found', statusCode: 404 });
    }

    const { internalNote, ...customerSafeRepair } = repair;
    return customerSafeRepair;
  }
}
