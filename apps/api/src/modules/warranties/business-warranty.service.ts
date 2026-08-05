import { randomBytes, createHash } from 'node:crypto';
import type { IssuedWarrantyDto } from '@warrantypass/shared';
import type { CorrectWarrantyInput, IssueWarrantyInput, RevokeWarrantyInput } from '@warrantypass/validation';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AppConfig } from '../../config/env.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import type { AuditWriter, BusinessAuthorizationContext } from '../../common/security/contracts.js';
import type { RequestMetadata } from '../../common/security/request-metadata.js';
import { normalizeEmail } from '../../common/utils/identifiers.js';
import type { EmailProvider } from '../../infrastructure/email/email-provider.js';
import type { SubscriptionEntitlementService } from '../businesses/subscription-entitlement.service.js';

export class BusinessWarrantyService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly email: EmailProvider,
    private readonly audit: AuditWriter,
    private readonly entitlementService: SubscriptionEntitlementService,
  ) {}

  public async listWarranties(
    context: BusinessAuthorizationContext,
    options?: {
      search?: string;
      productId?: string;
      status?: string;
      verificationLabel?: string;
      serialNumber?: string;
      warrantyNumber?: string;
    },
  ): Promise<IssuedWarrantyDto[]> {
    const where: any = {
      issuerBusinessId: context.businessId,
      source: 'BUSINESS_ISSUED',
      deletedAt: null,
    };

    if (options?.status) where.status = options.status;
    if (options?.verificationLabel) where.verificationLabel = options.verificationLabel;
    if (options?.productId) where.catalogProductId = options.productId;
    if (options?.serialNumber) {
      where.serialNumber = { contains: options.serialNumber, mode: 'insensitive' };
    }
    if (options?.warrantyNumber) {
      where.warrantyNumber = { contains: options.warrantyNumber, mode: 'insensitive' };
    }
    if (options?.search) {
      where.OR = [
        { warrantyNumber: { contains: options.search, mode: 'insensitive' } },
        { serialNumber: { contains: options.search, mode: 'insensitive' } },
        { customer: { email: { contains: options.search, mode: 'insensitive' } } },
      ];
    }

    const warranties = await this.prisma.warranty.findMany({
      where,
      include: {
        customer: { include: { profile: true } },
        catalogProduct: true,
        pendingRecipients: { where: { claimedAt: null } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return warranties.map((w) => this.mapIssuedWarrantyDto(w));
  }

  public async getWarrantyById(
    context: BusinessAuthorizationContext,
    warrantyId: string,
  ): Promise<IssuedWarrantyDto> {
    const warranty = await this.prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        issuerBusinessId: context.businessId,
        deletedAt: null,
      },
      include: {
        customer: { include: { profile: true } },
        catalogProduct: true,
        pendingRecipients: { where: { claimedAt: null } },
        revisions: { include: { correctedBy: true }, orderBy: { revisionNumber: 'desc' } },
      },
    });

    if (!warranty) {
      throw new NotFoundError('Issued warranty not found');
    }

    return this.mapIssuedWarrantyDto(warranty);
  }

  public async issueWarranty(
    context: BusinessAuthorizationContext,
    input: IssueWarrantyInput,
    metadata: RequestMetadata,
  ): Promise<IssuedWarrantyDto> {
    // 1. Check subscription entitlement
    await this.entitlementService.assertCanIssueWarranty(context.businessId);

    // 2. Check idempotency if provided
    if (input.idempotencyKey) {
      const existing = await this.prisma.warranty.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: {
          customer: { include: { profile: true } },
          catalogProduct: true,
          pendingRecipients: true,
        },
      });
      if (existing) {
        return this.mapIssuedWarrantyDto(existing);
      }
    }

    // 3. Find catalog product
    const product = await this.prisma.catalogProduct.findFirst({
      where: { id: input.productId, businessId: context.businessId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundError('Business product not found');
    }

    // 4. Calculate warranty end date
    const purchaseDateObj = new Date(input.purchaseDate);
    const startDateObj = input.startDate ? new Date(input.startDate) : purchaseDateObj;
    const endDateObj = this.calculateEndDate(startDateObj, input.durationValue, input.durationUnit);

    // 5. Look up business for prefix
    const business = await this.prisma.business.findUnique({
      where: { id: context.businessId },
    });
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const normalizedEmail = normalizeEmail(input.customerEmail);
    const existingCustomer = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const year = new Date().getFullYear();
    const cleanSlug = business.slug.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const randomCode = randomBytes(3).toString('hex').toUpperCase();
    const warrantyNumber = `WP-${cleanSlug || 'BIZ'}-${year}-${randomCode}`;
    const verificationCode = `VER-${randomBytes(6).toString('hex').toUpperCase()}`;

    // Execute issuance transaction
    const warranty = await this.prisma.$transaction(async (tx) => {
      const newWarranty = await tx.warranty.create({
        data: {
          issuerBusinessId: context.businessId,
          catalogProductId: product.id,
          templateId: input.templateId ?? null,
          customerUserId: existingCustomer ? existingCustomer.id : null,
          source: 'BUSINESS_ISSUED',
          status: 'ACTIVE',
          verificationLabel: 'VERIFIED_BY_BUSINESS',
          warrantyNumber,
          verificationCode,
          serialNumber: input.serialNumber,
          purchaseDate: purchaseDateObj,
          issueDate: new Date(),
          startDate: startDateObj,
          endDate: endDateObj,
          expiresAt: endDateObj,
          durationValue: input.durationValue,
          durationUnit: input.durationUnit,
          coverageType: input.coverageType,
          termsSummary: input.termsSummary,
          idempotencyKey: input.idempotencyKey ?? null,
        },
        include: {
          customer: { include: { profile: true } },
          catalogProduct: true,
          pendingRecipients: true,
        },
      });

      // If customer does not exist yet, create pending recipient record and token
      if (!existingCustomer) {
        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');

        await tx.pendingWarrantyRecipient.create({
          data: {
            email: normalizedEmail,
            warrantyId: newWarranty.id,
            invitationTokenHash: tokenHash,
            customerName: input.customerName ?? null,
            customerPhone: input.customerPhone ?? null,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Also create a CustomerProduct entry if customer already exists
      if (existingCustomer) {
        await tx.customerProduct.create({
          data: {
            customerUserId: existingCustomer.id,
            catalogProductId: product.id,
            brandId: product.brandId,
            categoryId: product.categoryId,
            productName: product.name,
            modelNumber: product.modelNumber,
            serialNumber: input.serialNumber,
            purchaseDate: purchaseDateObj,
            sellerName: input.sellerName ?? business.name,
            sourceType: 'BUSINESS_ISSUED',
            ownershipStatus: 'ACTIVE',
            warranties: {
              connect: { id: newWarranty.id },
            },
          },
        });

        await tx.notification.create({
          data: {
            recipientUserId: existingCustomer.id,
            type: 'WARRANTY_ISSUED',
            title: 'Verified Warranty Issued',
            message: `${business.name} issued a verified digital warranty (${warrantyNumber}) for ${product.name}.`,
            actionUrl: `/dashboard/warranties/${newWarranty.id}`,
            severity: 'SUCCESS',
          },
        });
      }

      return newWarranty;
    });

    // Send email notification / invite
    if (!existingCustomer) {
      await this.email.send({
        to: normalizedEmail,
        subject: `Digital Warranty Invitation from ${business.name}`,
        text: `You received a verified digital warranty for ${product.name} from ${business.name}. Register an account on WarrantyPass with ${normalizedEmail} to claim your digital warranty.`,
        html: `<p>You received a verified digital warranty for <strong>${product.name}</strong> from <strong>${business.name}</strong>.</p><p>Warranty Number: <code>${warrantyNumber}</code></p><p>Register an account on WarrantyPass with email <strong>${normalizedEmail}</strong> to view your warranty.</p>`,
      });
    } else {
      await this.email.send({
        to: normalizedEmail,
        subject: `Verified Digital Warranty Issued - ${warrantyNumber}`,
        text: `${business.name} issued a verified digital warranty (${warrantyNumber}) for ${product.name}. Log in to your WarrantyPass dashboard to view details.`,
        html: `<p><strong>${business.name}</strong> issued a verified digital warranty for <strong>${product.name}</strong>.</p><p>Warranty Number: <code>${warrantyNumber}</code></p><p>Log in to your <a href="${this.config.WEB_URL}/dashboard">WarrantyPass Dashboard</a> to view your wallet.</p>`,
      });
    }

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'warranty.issued',
      resourceType: 'Warranty',
      resourceId: warranty.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { warrantyNumber, customerEmail: normalizedEmail, isPending: !existingCustomer },
    });

    return this.mapIssuedWarrantyDto(warranty);
  }

  public async correctWarranty(
    context: BusinessAuthorizationContext,
    warrantyId: string,
    input: CorrectWarrantyInput,
    metadata: RequestMetadata,
  ): Promise<IssuedWarrantyDto> {
    const existing = await this.prisma.warranty.findFirst({
      where: { id: warrantyId, issuerBusinessId: context.businessId, deletedAt: null },
      include: { revisions: { orderBy: { revisionNumber: 'desc' } } },
    });

    if (!existing) {
      throw new NotFoundError('Issued warranty not found');
    }

    if (existing.status === 'REVOKED') {
      throw new AppError({ code: 'INVALID_STATE', message: 'Revoked warranties cannot be corrected', statusCode: 400 });
    }

    const previousRevisionNumber = existing.revisions[0]?.revisionNumber ?? 0;
    const newRevisionNumber = previousRevisionNumber + 1;

    const previousData = {
      serialNumber: existing.serialNumber,
      purchaseDate: existing.purchaseDate?.toISOString(),
      startDate: existing.startDate?.toISOString(),
      endDate: existing.endDate?.toISOString(),
      termsSummary: existing.termsSummary,
      warrantyNumber: existing.warrantyNumber,
    };

    const newData = {
      serialNumber: input.serialNumber ?? existing.serialNumber,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate).toISOString() : existing.purchaseDate?.toISOString(),
      startDate: input.startDate ? new Date(input.startDate).toISOString() : existing.startDate?.toISOString(),
      endDate: input.endDate ? new Date(input.endDate).toISOString() : existing.endDate?.toISOString(),
      termsSummary: input.termsSummary ?? existing.termsSummary,
      warrantyNumber: input.warrantyNumber ?? existing.warrantyNumber,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.warrantyRevision.create({
        data: {
          warrantyId: existing.id,
          correctedByUserId: context.userId,
          revisionNumber: newRevisionNumber,
          reason: input.reason,
          previousData,
          newData,
        },
      });

      return tx.warranty.update({
        where: { id: existing.id },
        data: {
          ...(input.serialNumber ? { serialNumber: input.serialNumber } : {}),
          ...(input.purchaseDate ? { purchaseDate: new Date(input.purchaseDate) } : {}),
          ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
          ...(input.endDate ? { endDate: new Date(input.endDate), expiresAt: new Date(input.endDate) } : {}),
          ...(input.termsSummary ? { termsSummary: input.termsSummary } : {}),
          ...(input.warrantyNumber ? { warrantyNumber: input.warrantyNumber } : {}),
        },
        include: {
          customer: { include: { profile: true } },
          catalogProduct: true,
          pendingRecipients: true,
        },
      });
    });

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'warranty.corrected',
      resourceType: 'Warranty',
      resourceId: warrantyId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { revisionNumber: newRevisionNumber, reason: input.reason },
    });

    return this.mapIssuedWarrantyDto(updated);
  }

  public async revokeWarranty(
    context: BusinessAuthorizationContext,
    warrantyId: string,
    input: RevokeWarrantyInput,
    metadata: RequestMetadata,
  ): Promise<IssuedWarrantyDto> {
    const existing = await this.prisma.warranty.findFirst({
      where: { id: warrantyId, issuerBusinessId: context.businessId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Issued warranty not found');
    }

    const revoked = await this.prisma.warranty.update({
      where: { id: warrantyId },
      data: {
        status: 'REVOKED',
        verificationLabel: 'REVOKED',
        revokedAt: new Date(),
        revokedByUserId: context.userId,
        revocationReason: input.reason,
      },
      include: {
        customer: { include: { profile: true } },
        catalogProduct: true,
        pendingRecipients: true,
      },
    });

    if (existing.customerUserId) {
      await this.prisma.notification.create({
        data: {
          recipientUserId: existing.customerUserId,
          type: 'WARRANTY_REVOKED',
          title: 'Warranty Revoked',
          message: `Warranty ${existing.warrantyNumber} has been revoked by the issuing business. Reason: ${input.reason}`,
          actionUrl: `/dashboard/warranties/${warrantyId}`,
          severity: 'WARNING',
        },
      });
    }

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'warranty.revoked',
      resourceType: 'Warranty',
      resourceId: warrantyId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { reason: input.reason },
    });

    return this.mapIssuedWarrantyDto(revoked);
  }

  private calculateEndDate(startDate: Date, durationValue: number, durationUnit: string): Date {
    const result = new Date(startDate);
    if (durationUnit === 'DAYS') {
      result.setDate(result.getDate() + durationValue);
    } else if (durationUnit === 'MONTHS') {
      result.setMonth(result.getMonth() + durationValue);
    } else if (durationUnit === 'YEARS') {
      result.setFullYear(result.getFullYear() + durationValue);
    }
    return result;
  }

  private mapIssuedWarrantyDto(w: any): IssuedWarrantyDto {
    const isPending = !w.customerUserId && w.pendingRecipients && w.pendingRecipients.length > 0;
    return {
      id: w.id,
      businessId: w.issuerBusinessId,
      customerUserId: w.customerUserId,
      customerEmail: w.customer?.email ?? w.pendingRecipients?.[0]?.email ?? null,
      customerName: w.customer?.profile?.displayName ?? w.pendingRecipients?.[0]?.customerName ?? null,
      warrantyNumber: w.warrantyNumber ?? '',
      verificationCode: w.verificationCode ?? '',
      serialNumber: w.serialNumber ?? '',
      productName: w.catalogProduct?.name ?? 'Warranty Product',
      modelNumber: w.catalogProduct?.modelNumber ?? null,
      purchaseDate: w.purchaseDate ? w.purchaseDate.toISOString() : '',
      issueDate: w.issueDate ? w.issueDate.toISOString() : '',
      startDate: w.startDate ? w.startDate.toISOString() : '',
      endDate: w.endDate ? w.endDate.toISOString() : '',
      status: w.status,
      verificationLabel: w.verificationLabel,
      termsSummary: w.termsSummary ?? '',
      isPendingRecipient: isPending,
      createdAt: w.createdAt.toISOString(),
    };
  }
}
