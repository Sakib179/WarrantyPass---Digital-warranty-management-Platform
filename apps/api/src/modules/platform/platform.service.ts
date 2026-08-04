import type {
  AuditLogDto,
  PlatformDashboardDto,
  VerificationQueueItemDto,
} from '@warrantypass/shared';
import type { BusinessStatus, PrismaClient } from '../../generated/prisma/client.js';

import type { AppConfig } from '../../config/env.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import type { AuditWriter } from '../../common/security/contracts.js';
import type { RequestMetadata } from '../../common/security/request-metadata.js';
import { businessDecisionEmail } from '../../infrastructure/email/email-templates.js';
import type { EmailProvider } from '../../infrastructure/email/email-provider.js';

const transitions: Readonly<Record<string, readonly BusinessStatus[]>> = {
  DRAFT: ['PENDING'],
  PENDING: ['IN_REVIEW'],
  PENDING_VERIFICATION: ['IN_REVIEW'],
  IN_REVIEW: ['VERIFIED', 'MORE_INFORMATION_REQUIRED', 'REJECTED'],
  MORE_INFORMATION_REQUIRED: ['PENDING'],
  VERIFIED: ['SUSPENDED', 'DEACTIVATED'],
  SUSPENDED: ['VERIFIED'],
} as const;

export function isValidBusinessTransition(from: BusinessStatus, to: BusinessStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export class PlatformService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly email: EmailProvider,
    private readonly audit: AuditWriter,
  ) {}

  public async dashboard(): Promise<PlatformDashboardDto> {
    const [
      pendingApplications,
      applicationsInReview,
      moreInformationRequests,
      verifiedBusinesses,
      suspendedBusinesses,
      recentSecurityEvents,
    ] = await Promise.all([
      this.prisma.business.count({
        where: { status: { in: ['PENDING', 'PENDING_VERIFICATION'] } },
      }),
      this.prisma.business.count({ where: { status: 'IN_REVIEW' } }),
      this.prisma.business.count({ where: { status: 'MORE_INFORMATION_REQUIRED' } }),
      this.prisma.business.count({ where: { status: 'VERIFIED' } }),
      this.prisma.business.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
          action: {
            in: [
              'LOGIN_FAILED',
              'REFRESH_TOKEN_REUSE_DETECTED',
              'PASSWORD_RESET_COMPLETED',
              'BUSINESS_SUSPENDED',
            ],
          },
        },
      }),
    ]);
    return {
      pendingApplications,
      applicationsInReview,
      moreInformationRequests,
      verifiedBusinesses,
      suspendedBusinesses,
      recentSecurityEvents,
    };
  }

  public async verificationQueue(statuses?: BusinessStatus[]): Promise<VerificationQueueItemDto[]> {
    const businesses = await this.prisma.business.findMany({
      where: {
        status: {
          in:
            statuses && statuses.length > 0
              ? statuses
              : ['PENDING', 'PENDING_VERIFICATION', 'IN_REVIEW', 'MORE_INFORMATION_REQUIRED'],
        },
        deletedAt: null,
      },
      include: {
        verifications: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          include: { claimedBy: { include: { profile: true } } },
        },
        verificationRevisions: { orderBy: { version: 'desc' }, take: 1 },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'asc' }],
    });
    return businesses.map((business) => {
      const verification = business.verifications[0];
      const revision = business.verificationRevisions[0];
      return {
        businessId: business.id,
        displayName: business.name,
        legalName: business.legalName ?? business.name,
        referenceNumber: business.verificationReference,
        status: business.status === 'PENDING_VERIFICATION' ? 'PENDING' : business.status,
        duplicateIdentifierFlag: business.duplicateIdentifierFlag,
        submittedAt: revision?.submittedAt?.toISOString() ?? null,
        claimedBy:
          verification?.claimedBy?.profile?.displayName ?? verification?.claimedBy?.email ?? null,
      };
    });
  }

  public async applicationDetail(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        verificationRevisions: {
          orderBy: { version: 'desc' },
          include: {
            documents: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
            },
            submittedBy: { include: { profile: true } },
          },
        },
        verificationStatusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { include: { profile: true } } },
        },
        verifications: {
          orderBy: { submittedAt: 'desc' },
          include: {
            claimedBy: { include: { profile: true } },
            reviewedBy: { include: { profile: true } },
          },
        },
      },
    });
    if (!business) throw new NotFoundError('The business application was not found.');
    return {
      id: business.id,
      name: business.name,
      legalName: business.legalName,
      status: business.status === 'PENDING_VERIFICATION' ? 'PENDING' : business.status,
      statusVersion: business.statusVersion,
      referenceNumber: business.verificationReference,
      duplicateIdentifierFlag: business.duplicateIdentifierFlag,
      identifiers: {
        tradeLicenseNumber: business.registrationNumber,
        binNumber: business.binNumber,
      },
      revisions: business.verificationRevisions.map((revision) => ({
        id: revision.id,
        version: revision.version,
        status: revision.status,
        submittedAt: revision.submittedAt?.toISOString() ?? null,
        submittedBy: revision.submittedBy.profile?.displayName ?? revision.submittedBy.email,
        fields: {
          ownerFullName: revision.ownerFullName,
          legalName: revision.legalName,
          displayName: revision.displayName,
          businessType: revision.businessType,
          phone: revision.phone,
          businessEmail: revision.businessEmail,
          website: revision.website,
          addressLine: revision.addressLine,
          area: revision.area,
          district: revision.district,
          division: revision.division,
          postalCode: revision.postalCode,
        },
        documents: revision.documents.map((document) => ({
          id: document.id,
          kind: document.kind,
          displayName: document.displayName,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          scanStatus: document.scanStatus,
        })),
      })),
      history: business.verificationStatusHistory.map((history) => ({
        id: history.id,
        previousStatus: history.previousStatus,
        newStatus: history.newStatus,
        internalNote: history.internalNote,
        userVisibleReason: history.userVisibleReason,
        reviewer: history.reviewer?.profile?.displayName ?? history.reviewer?.email ?? null,
        createdAt: history.createdAt.toISOString(),
      })),
      review: business.verifications[0]
        ? {
            id: business.verifications[0].id,
            internalNote: business.verifications[0].reviewNotes,
            userVisibleReason: business.verifications[0].userVisibleReason,
            rejectionCategory: business.verifications[0].rejectionCategory,
            claimedBy:
              business.verifications[0].claimedBy?.profile?.displayName ??
              business.verifications[0].claimedBy?.email ??
              null,
          }
        : null,
    };
  }

  public async claim(
    businessId: string,
    reviewerId: string,
    internalNote: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const business = await this.requireBusiness(businessId);
    this.assertTransition(business.status, 'IN_REVIEW');
    const latestVerification = await this.prisma.businessVerification.findFirst({
      where: { businessId },
      orderBy: { submittedAt: 'desc' },
    });
    if (!latestVerification) throw new NotFoundError('The verification submission was not found.');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.business.update({
        where: { id: businessId },
        data: { status: 'IN_REVIEW', statusVersion: { increment: 1 } },
      }),
      this.prisma.businessVerification.update({
        where: { id: latestVerification.id },
        data: {
          status: 'IN_REVIEW',
          claimedByUserId: reviewerId,
          claimedAt: now,
          reviewNotes: internalNote,
        },
      }),
      this.prisma.businessVerificationStatusHistory.create({
        data: {
          businessId,
          previousStatus: business.status,
          newStatus: 'IN_REVIEW',
          reviewerId,
          internalNote,
        },
      }),
    ]);
    await this.writeReviewAudit('VERIFICATION_REVIEW_STARTED', businessId, reviewerId, metadata);
  }

  public approve(
    businessId: string,
    reviewerId: string,
    reviewerNote: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    return this.decision({
      businessId,
      reviewerId,
      to: 'VERIFIED',
      internalNote: reviewerNote,
      emailDecision: 'approved',
      auditAction: 'BUSINESS_APPROVED',
      metadata,
    });
  }

  public requestMoreInformation(
    businessId: string,
    reviewerId: string,
    userVisibleReason: string,
    internalNote: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    return this.decision({
      businessId,
      reviewerId,
      to: 'MORE_INFORMATION_REQUIRED',
      internalNote,
      userVisibleReason,
      emailDecision: 'more-information',
      auditAction: 'MORE_INFORMATION_REQUESTED',
      metadata,
    });
  }

  public reject(
    businessId: string,
    reviewerId: string,
    category: string,
    userVisibleReason: string,
    internalNote: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    return this.decision({
      businessId,
      reviewerId,
      to: 'REJECTED',
      internalNote,
      userVisibleReason,
      rejectionCategory: category,
      emailDecision: 'rejected',
      auditAction: 'BUSINESS_REJECTED',
      metadata,
    });
  }

  public suspend(
    businessId: string,
    reviewerId: string,
    userVisibleReason: string,
    internalNote: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    return this.decision({
      businessId,
      reviewerId,
      to: 'SUSPENDED',
      internalNote,
      userVisibleReason,
      emailDecision: 'suspended',
      auditAction: 'BUSINESS_SUSPENDED',
      metadata,
    });
  }

  public restore(
    businessId: string,
    reviewerId: string,
    internalNote: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    return this.decision({
      businessId,
      reviewerId,
      to: 'VERIFIED',
      internalNote,
      emailDecision: 'approved',
      auditAction: 'BUSINESS_RESTORED',
      metadata,
    });
  }

  public async auditLogs(
    page: number,
    pageSize: number,
  ): Promise<{
    items: AuditLogDto[];
    total: number;
  }> {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        include: { actorUser: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count(),
    ]);
    return {
      total,
      items: logs.map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorUser?.email ?? null,
        businessId: log.businessId,
        targetType: log.resourceType,
        targetId: log.resourceId,
        requestId: log.requestId,
        createdAt: log.createdAt.toISOString(),
        metadata: isAuditMetadata(log.metadata) ? log.metadata : null,
      })),
    };
  }

  public async userLookup(search: string) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { displayName: { contains: search, mode: 'insensitive' } } },
        ],
      },
      include: {
        profile: true,
        _count: { select: { businessMemberships: true, sessions: true } },
      },
      take: 25,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.profile?.displayName ?? null,
      status: user.status,
      emailVerified: Boolean(user.emailVerifiedAt),
      memberships: user._count.businessMemberships,
      sessions: user._count.sessions,
      createdAt: user.createdAt.toISOString(),
    }));
  }

  private async decision(input: {
    businessId: string;
    reviewerId: string;
    to: BusinessStatus;
    internalNote: string;
    userVisibleReason?: string;
    rejectionCategory?: string;
    emailDecision: 'approved' | 'more-information' | 'rejected' | 'suspended';
    auditAction: string;
    metadata: RequestMetadata;
  }): Promise<void> {
    const business = await this.requireBusiness(input.businessId);
    this.assertTransition(business.status, input.to);
    const verification = await this.prisma.businessVerification.findFirst({
      where: { businessId: input.businessId },
      orderBy: { submittedAt: 'desc' },
    });
    if (!verification && business.status !== 'SUSPENDED') {
      throw new NotFoundError('The verification review record was not found.');
    }
    const now = new Date();
    const verificationStatus =
      input.to === 'VERIFIED'
        ? 'VERIFIED'
        : input.to === 'MORE_INFORMATION_REQUIRED'
          ? 'MORE_INFORMATION_REQUIRED'
          : input.to === 'REJECTED'
            ? 'REJECTED'
            : 'SUSPENDED';
    await this.prisma.$transaction(async (transaction) => {
      await transaction.business.update({
        where: { id: input.businessId },
        data: {
          status: input.to,
          statusVersion: { increment: 1 },
          ...(input.to === 'VERIFIED'
            ? { verifiedAt: now, verifiedByUserId: input.reviewerId }
            : {}),
        },
      });
      if (verification) {
        await transaction.businessVerification.update({
          where: { id: verification.id },
          data: {
            status: verificationStatus,
            reviewedByUserId: input.reviewerId,
            reviewedAt: now,
            reviewNotes: input.internalNote,
            userVisibleReason: input.userVisibleReason ?? null,
            rejectionCategory: input.rejectionCategory ?? null,
          },
        });
      }
      await transaction.businessVerificationStatusHistory.create({
        data: {
          businessId: input.businessId,
          previousStatus: business.status,
          newStatus: input.to,
          reviewerId: input.reviewerId,
          internalNote: input.internalNote,
          userVisibleReason: input.userVisibleReason ?? null,
        },
      });
    });
    await this.writeReviewAudit(
      input.auditAction,
      input.businessId,
      input.reviewerId,
      input.metadata,
    );
    const owner = await this.businessOwner(input.businessId);
    if (owner) {
      const template = businessDecisionEmail({
        businessName: business.name,
        decision: input.emailDecision,
        ...(input.userVisibleReason ? { reason: input.userVisibleReason } : {}),
        actionUrl: `${this.config.WEB_URL}/business/application`,
      });
      await this.email.send({ to: owner.email, ...template });
    }
  }

  private async requireBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundError('The business application was not found.');
    return business;
  }

  private assertTransition(from: BusinessStatus, to: BusinessStatus): void {
    if (!isValidBusinessTransition(from, to)) {
      throw new AppError({
        code: 'INVALID_STATUS_TRANSITION',
        message: `The business cannot move from ${from} to ${to}.`,
        statusCode: 409,
      });
    }
  }

  private async businessOwner(businessId: string) {
    return this.prisma.user.findFirst({
      where: {
        businessMemberships: {
          some: {
            businessId,
            status: 'ACTIVE',
            OR: [
              { role: { key: 'system:business-owner' } },
              { roles: { some: { role: { key: 'system:business-owner' } } } },
            ],
          },
        },
      },
    });
  }

  private writeReviewAudit(
    action: string,
    businessId: string,
    reviewerId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    return this.audit.write({
      actorUserId: reviewerId,
      businessId,
      action,
      resourceType: 'Business',
      resourceId: businessId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }
}

function isAuditMetadata(
  value: unknown,
): value is Record<string, string | number | boolean | null> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (item) =>
        item === null ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean',
    )
  );
}
