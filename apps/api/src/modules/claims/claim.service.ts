import { randomBytes } from 'node:crypto';
import type {
  BusinessClaimDetailDto,
  CustomerClaimDetailDto,
  CustomerClaimListItemDto,
  PaginatedDto,
} from '@warrantypass/shared';
import type {
  AssignClaimInput,
  CancelClaimInput,
  PostClaimMessageInput,
  SubmitClaimInput,
  UpdateClaimStatusInput,
} from '@warrantypass/validation';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AppConfig } from '../../config/env.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import type { AuditWriter, BusinessAuthorizationContext } from '../../common/security/contracts.js';
import type { RequestMetadata } from '../../common/security/request-metadata.js';
import type { ClaimEligibilityService } from './claim-eligibility.service.js';

export class ClaimService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly audit: AuditWriter,
    private readonly eligibilityService: ClaimEligibilityService,
  ) {}

  // --------------------------------------------------
  // CUSTOMER METHODS
  // --------------------------------------------------

  public async listCustomerClaims(
    userId: string,
    options?: { page?: number; pageSize?: number; status?: string },
  ): Promise<PaginatedDto<CustomerClaimListItemDto>> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      submittedByUserId: userId,
      deletedAt: null,
    };
    if (options?.status) {
      where.status = options.status;
    }

    const [totalItems, claims] = await Promise.all([
      this.prisma.warrantyClaim.count({ where }),
      this.prisma.warrantyClaim.findMany({
        where,
        include: {
          warranty: {
            include: {
              catalogProduct: true,
              customerProduct: true,
              issuerBusiness: true,
            },
          },
          business: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const items: CustomerClaimListItemDto[] = claims.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      warrantyId: c.warrantyId,
      productName: c.warranty.catalogProduct?.name ?? c.warranty.customerProduct?.productName ?? 'Product',
      businessName: c.business.name,
      status: c.status,
      subject: c.subject,
      submittedAt: c.submittedAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      requiresAction: c.status === 'MORE_INFORMATION_REQUIRED',
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  public async getCustomerClaimById(userId: string, claimId: string): Promise<CustomerClaimDetailDto> {
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, submittedByUserId: userId, deletedAt: null },
      include: {
        warranty: {
          include: {
            catalogProduct: true,
            customerProduct: true,
            issuerBusiness: true,
          },
        },
        business: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        messages: {
          where: { isInternalNote: false },
          include: { sender: { include: { profile: true } }, attachments: true },
          orderBy: { createdAt: 'asc' },
        },
        attachments: { where: { messageId: null } },
      },
    });

    if (!claim) {
      throw new NotFoundError('Claim not found');
    }

    return {
      id: claim.id,
      referenceNumber: claim.referenceNumber,
      warrantyId: claim.warrantyId,
      warrantyNumber: claim.warranty.warrantyNumber,
      productName: claim.warranty.catalogProduct?.name ?? claim.warranty.customerProduct?.productName ?? 'Product',
      modelNumber: claim.warranty.catalogProduct?.modelNumber ?? claim.warranty.customerProduct?.modelNumber ?? null,
      serialNumber: claim.warranty.serialNumber,
      businessName: claim.business.name,
      status: claim.status,
      subject: claim.subject,
      description: claim.description,
      problemStartDate: claim.problemStartDate ? claim.problemStartDate.toISOString() : null,
      productCondition: claim.productCondition,
      preferredContactMethod: claim.preferredContactMethod,
      customerPhone: claim.customerPhone,
      preferredServiceLocation: claim.preferredServiceLocation,
      rejectionReason: claim.rejectionReason,
      moreInfoRequestedNotes: claim.moreInfoRequestedNotes,
      moreInfoDeadline: claim.moreInfoDeadline ? claim.moreInfoDeadline.toISOString() : null,
      cancelledAt: claim.cancelledAt ? claim.cancelledAt.toISOString() : null,
      cancellationReason: claim.cancellationReason,
      submittedAt: claim.submittedAt.toISOString(),
      resolvedAt: claim.resolvedAt ? claim.resolvedAt.toISOString() : null,
      createdAt: claim.createdAt.toISOString(),
      statusTimeline: claim.statusHistory.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        publicNote: h.publicNote,
        createdAt: h.createdAt.toISOString(),
      })),
      messages: claim.messages.map((m) => ({
        id: m.id,
        senderName: m.sender.profile?.displayName ?? m.sender.email,
        senderType: m.senderType,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
        attachments: m.attachments.map((a) => ({
          id: a.id,
          storageKey: a.storageKey,
          originalName: a.originalName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
        })),
      })),
      attachments: claim.attachments.map((a) => ({
        id: a.id,
        storageKey: a.storageKey,
        originalName: a.originalName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    };
  }

  public async submitClaim(
    userId: string,
    input: SubmitClaimInput,
    metadata: RequestMetadata,
  ): Promise<CustomerClaimDetailDto> {
    const warranty = await this.eligibilityService.assertClaimEligibility(userId, input.warrantyId);
    const businessId = warranty.issuerBusinessId!;

    const year = new Date().getFullYear();
    const randomCode = randomBytes(3).toString('hex').toUpperCase();
    const referenceNumber = `CLM-${year}-${randomCode}`;

    const claim = await this.prisma.$transaction(async (tx) => {
      const created = await tx.warrantyClaim.create({
        data: {
          warrantyId: warranty.id,
          businessId,
          submittedByUserId: userId,
          referenceNumber,
          status: 'SUBMITTED',
          subject: input.subject,
          description: input.description,
          problemStartDate: input.problemStartDate ? new Date(input.problemStartDate) : null,
          productCondition: input.productCondition ?? null,
          preferredContactMethod: input.preferredContactMethod ?? null,
          customerPhone: input.customerPhone ?? null,
          preferredServiceLocation: input.preferredServiceLocation ?? null,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: created.id,
          fromStatus: null,
          toStatus: 'SUBMITTED',
          changedById: userId,
          publicNote: 'Claim submitted by customer',
        },
      });

      return created;
    });

    await this.audit.write({
      actorUserId: userId,
      businessId,
      action: 'claim.submitted',
      resourceType: 'WarrantyClaim',
      resourceId: claim.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { referenceNumber },
    });

    return this.getCustomerClaimById(userId, claim.id);
  }

  public async cancelCustomerClaim(
    userId: string,
    claimId: string,
    input: CancelClaimInput,
    metadata: RequestMetadata,
  ): Promise<CustomerClaimDetailDto> {
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, submittedByUserId: userId, deletedAt: null },
    });

    if (!claim) throw new NotFoundError('Claim not found');

    if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(claim.status)) {
      throw new AppError({ code: 'INVALID_STATE', message: `Cannot cancel a claim in ${claim.status} status`, statusCode: 400 });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.warrantyClaim.update({
        where: { id: claimId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: input.reason,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId,
          fromStatus: claim.status,
          toStatus: 'CANCELLED',
          changedById: userId,
          publicNote: `Claim cancelled by customer: ${input.reason}`,
        },
      });
    });

    await this.audit.write({
      actorUserId: userId,
      businessId: claim.businessId,
      action: 'claim.cancelled',
      resourceType: 'WarrantyClaim',
      resourceId: claimId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { reason: input.reason },
    });

    return this.getCustomerClaimById(userId, claimId);
  }

  // --------------------------------------------------
  // BUSINESS METHODS
  // --------------------------------------------------

  public async listBusinessClaims(
    context: BusinessAuthorizationContext,
    options?: {
      page?: number;
      pageSize?: number;
      status?: string;
      assignedMemberId?: string;
      search?: string;
    },
  ): Promise<PaginatedDto<BusinessClaimDetailDto>> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      businessId: context.businessId,
      deletedAt: null,
    };

    if (options?.status) where.status = options.status;
    if (options?.assignedMemberId) where.assignedBusinessMemberId = options.assignedMemberId;
    if (options?.search) {
      where.OR = [
        { referenceNumber: { contains: options.search, mode: 'insensitive' } },
        { subject: { contains: options.search, mode: 'insensitive' } },
        { submittedBy: { email: { contains: options.search, mode: 'insensitive' } } },
      ];
    }

    const [totalItems, claims] = await Promise.all([
      this.prisma.warrantyClaim.count({ where }),
      this.prisma.warrantyClaim.findMany({
        where,
        include: {
          submittedBy: { include: { profile: true } },
          warranty: { include: { catalogProduct: true, customerProduct: true } },
          assignedMember: { include: { user: { include: { profile: true } }, role: true } },
          statusHistory: { orderBy: { createdAt: 'asc' } },
          messages: { include: { sender: { include: { profile: true } }, attachments: true }, orderBy: { createdAt: 'asc' } },
          attachments: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const items: BusinessClaimDetailDto[] = claims.map((c) => this.mapBusinessClaimDto(c));

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  public async getBusinessClaimById(
    context: BusinessAuthorizationContext,
    claimId: string,
  ): Promise<BusinessClaimDetailDto> {
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, businessId: context.businessId, deletedAt: null },
      include: {
        submittedBy: { include: { profile: true } },
        warranty: { include: { catalogProduct: true, customerProduct: true } },
        assignedMember: { include: { user: { include: { profile: true } }, role: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        messages: { include: { sender: { include: { profile: true } }, attachments: true }, orderBy: { createdAt: 'asc' } },
        attachments: true,
      },
    });

    if (!claim) throw new NotFoundError('Business claim not found');

    return this.mapBusinessClaimDto(claim);
  }

  public async updateClaimStatus(
    context: BusinessAuthorizationContext,
    claimId: string,
    input: UpdateClaimStatusInput,
    metadata: RequestMetadata,
  ): Promise<BusinessClaimDetailDto> {
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, businessId: context.businessId, deletedAt: null },
    });

    if (!claim) throw new NotFoundError('Business claim not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.warrantyClaim.update({
        where: { id: claimId },
        data: {
          status: input.status,
          ...(input.rejectionCategory ? { rejectionCategory: input.rejectionCategory } : {}),
          ...(input.rejectionReason ? { rejectionReason: input.rejectionReason } : {}),
          ...(input.moreInfoRequestedNotes ? { moreInfoRequestedNotes: input.moreInfoRequestedNotes } : {}),
          ...(input.moreInfoDeadline ? { moreInfoDeadline: new Date(input.moreInfoDeadline) } : {}),
          ...(input.status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
          ...(input.status === 'CLOSED' ? { closedAt: new Date() } : {}),
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId,
          fromStatus: claim.status,
          toStatus: input.status,
          changedById: context.userId,
          publicNote: input.publicNote ?? null,
          internalNote: input.internalNote ?? null,
        },
      });

      // Send notification to customer
      await tx.notification.create({
        data: {
          recipientUserId: claim.submittedByUserId,
          type: 'CLAIM_STATUS_UPDATED',
          title: `Claim Update (${claim.referenceNumber})`,
          message: `Your warranty claim status was updated to ${input.status}.`,
          actionUrl: `/dashboard/claims/${claimId}`,
          severity: 'INFO',
        },
      });

      return res;
    });

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'claim.status_updated',
      resourceType: 'WarrantyClaim',
      resourceId: claimId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { fromStatus: claim.status, toStatus: input.status },
    });

    return this.getBusinessClaimById(context, claimId);
  }

  public async assignClaim(
    context: BusinessAuthorizationContext,
    claimId: string,
    input: AssignClaimInput,
    metadata: RequestMetadata,
  ): Promise<BusinessClaimDetailDto> {
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, businessId: context.businessId, deletedAt: null },
    });

    if (!claim) throw new NotFoundError('Business claim not found');

    if (input.assignedBusinessMemberId) {
      const member = await this.prisma.businessMember.findFirst({
        where: { id: input.assignedBusinessMemberId, businessId: context.businessId, status: 'ACTIVE' },
      });
      if (!member) {
        throw new AppError({ code: 'VALIDATION_ERROR', message: 'Assigned staff member must be an active member of this business', statusCode: 400 });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.warrantyClaim.update({
        where: { id: claimId },
        data: {
          assignedBusinessMemberId: input.assignedBusinessMemberId,
          ...(claim.status === 'SUBMITTED' ? { status: 'ASSIGNED' } : {}),
        },
      });

      await tx.claimAssignmentHistory.create({
        data: {
          claimId,
          previousAssigneeMemberId: claim.assignedBusinessMemberId,
          newAssigneeMemberId: input.assignedBusinessMemberId,
          assignedByUserId: context.userId,
          reason: input.reason ?? null,
        },
      });
    });

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'claim.assigned',
      resourceType: 'WarrantyClaim',
      resourceId: claimId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { assignedMemberId: input.assignedBusinessMemberId ?? null },
    });

    return this.getBusinessClaimById(context, claimId);
  }

  public async postMessage(
    userId: string,
    businessId: string | null,
    claimId: string,
    input: PostClaimMessageInput,
  ): Promise<void> {
    const claim = await this.prisma.warrantyClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim) throw new NotFoundError('Claim not found');

    const senderType = businessId ? 'BUSINESS_EMPLOYEE' : 'CUSTOMER';

    await this.prisma.claimMessage.create({
      data: {
        claimId,
        senderUserId: userId,
        senderType,
        isInternalNote: input.isInternalNote,
        message: input.message,
      },
    });

    if (senderType === 'CUSTOMER' && claim.status === 'MORE_INFORMATION_REQUIRED') {
      await this.prisma.$transaction(async (tx) => {
        await tx.warrantyClaim.update({
          where: { id: claimId },
          data: { status: 'UNDER_REVIEW' },
        });

        await tx.claimStatusHistory.create({
          data: {
            claimId,
            fromStatus: 'MORE_INFORMATION_REQUIRED',
            toStatus: 'UNDER_REVIEW',
            changedById: userId,
            publicNote: 'Customer provided requested information',
          },
        });
      });
    }
  }

  private mapBusinessClaimDto(c: any): BusinessClaimDetailDto {
    return {
      id: c.id,
      businessId: c.businessId,
      warrantyId: c.warrantyId,
      referenceNumber: c.referenceNumber,
      status: c.status,
      subject: c.subject,
      description: c.description,
      problemStartDate: c.problemStartDate ? c.problemStartDate.toISOString() : null,
      productCondition: c.productCondition,
      preferredContactMethod: c.preferredContactMethod,
      customerPhone: c.customerPhone,
      preferredServiceLocation: c.preferredServiceLocation,
      rejectionCategory: c.rejectionCategory,
      rejectionReason: c.rejectionReason,
      moreInfoRequestedNotes: c.moreInfoRequestedNotes,
      moreInfoDeadline: c.moreInfoDeadline ? c.moreInfoDeadline.toISOString() : null,
      cancelledAt: c.cancelledAt ? c.cancelledAt.toISOString() : null,
      cancellationReason: c.cancellationReason,
      closedAt: c.closedAt ? c.closedAt.toISOString() : null,
      submittedAt: c.submittedAt.toISOString(),
      resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      customer: {
        id: c.submittedBy.id,
        name: c.submittedBy.profile?.displayName ?? c.submittedBy.email,
        email: c.submittedBy.email,
      },
      warranty: {
        warrantyNumber: c.warranty.warrantyNumber ?? '',
        productName: c.warranty.catalogProduct?.name ?? c.warranty.customerProduct?.productName ?? 'Product',
        modelNumber: c.warranty.catalogProduct?.modelNumber ?? c.warranty.customerProduct?.modelNumber ?? null,
        serialNumber: c.warranty.serialNumber,
        startDate: c.warranty.startDate ? c.warranty.startDate.toISOString() : null,
        endDate: c.warranty.endDate ? c.warranty.endDate.toISOString() : null,
        status: c.warranty.status,
        verificationLabel: c.warranty.verificationLabel,
      },
      assignedMember: c.assignedMember
        ? {
            id: c.assignedMember.id,
            name: c.assignedMember.user.profile?.displayName ?? c.assignedMember.user.email,
            email: c.assignedMember.user.email,
            roleName: c.assignedMember.role.name,
          }
        : null,
      statusHistory: c.statusHistory.map((h: any) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedByName: 'Staff Member',
        publicNote: h.publicNote,
        internalNote: h.internalNote,
        createdAt: h.createdAt.toISOString(),
      })),
      messages: c.messages.map((m: any) => ({
        id: m.id,
        claimId: m.claimId,
        senderUserId: m.senderUserId,
        senderName: m.sender.profile?.displayName ?? m.sender.email,
        senderType: m.senderType,
        isInternalNote: m.isInternalNote,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
        attachments: m.attachments ? m.attachments.map((a: any) => ({
          id: a.id,
          storageKey: a.storageKey,
          originalName: a.originalName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          scanStatus: a.scanStatus,
          createdAt: a.createdAt.toISOString(),
        })) : [],
      })),
      attachments: c.attachments ? c.attachments.map((a: any) => ({
        id: a.id,
        storageKey: a.storageKey,
        originalName: a.originalName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        scanStatus: a.scanStatus,
        createdAt: a.createdAt.toISOString(),
      })) : [],
    };
  }
}
