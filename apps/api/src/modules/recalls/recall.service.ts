import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BusinessAuthorizationContext } from '../../common/security/contracts.js';
import { AppError } from '../../common/errors/app-error.js';
import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import type {
  CreateRecallNoticeInput,
  AcknowledgeRecallInput,
} from '@warrantypass/validation';

export class RecallService {
  public constructor(private readonly prisma: PrismaClient) {}

  private generateRecallReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCL-${timestamp}-${random}`;
  }

  public async createRecallNotice(auth: BusinessAuthorizationContext, input: CreateRecallNoticeInput) {
    if (!auth.permissions.has(BUSINESS_PERMISSIONS.RECALLS_CREATE) && !auth.isOwner) {
      throw new AppError({ code: 'BUSINESS_PERMISSION_DENIED', message: 'Permission denied', statusCode: 403 });
    }

    const publicReferenceNumber = this.generateRecallReference();

    const notice = await this.prisma.recallNotice.create({
      data: {
        businessId: auth.businessId,
        title: input.title,
        publicReferenceNumber,
        severity: input.severity,
        noticeType: input.noticeType,
        description: input.description,
        customerInstructions: input.customerInstructions,
        affectedBrandId: input.affectedBrandId ?? null,
        affectedModelNumbers: input.affectedModelNumbers,
        affectedSerialNumberRanges: input.affectedSerialNumberRanges ?? null,
        affectedPurchaseStart: input.affectedPurchaseStart ? new Date(input.affectedPurchaseStart) : null,
        affectedPurchaseEnd: input.affectedPurchaseEnd ? new Date(input.affectedPurchaseEnd) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        status: 'DRAFT',
        createdByUserId: auth.userId,
      },
      include: {
        affectedBrand: true,
      },
    });

    return notice;
  }

  public async publishRecallNotice(auth: BusinessAuthorizationContext, recallId: string) {
    if (!auth.permissions.has(BUSINESS_PERMISSIONS.RECALLS_PUBLISH) && !auth.isOwner) {
      throw new AppError({ code: 'BUSINESS_PERMISSION_DENIED', message: 'Permission denied', statusCode: 403 });
    }

    const notice = await this.prisma.recallNotice.findFirst({
      where: { id: recallId, businessId: auth.businessId },
    });

    if (!notice) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Recall notice not found', statusCode: 404 });
    }

    if (notice.status === 'PUBLISHED') {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Recall notice is already published', statusCode: 400 });
    }

    const now = new Date();

    const publishedNotice = await this.prisma.recallNotice.update({
      where: { id: recallId },
      data: {
        status: 'PUBLISHED',
        publishedAt: now,
        approvedByUserId: auth.userId,
      },
    });

    const matchingProducts = await this.prisma.customerProduct.findMany({
      where: {
        warranties: {
          some: {
            issuerBusinessId: auth.businessId,
          },
        },
        modelNumber: { in: notice.affectedModelNumbers },
        deletedAt: null,
      },
      select: {
        id: true,
        customerUserId: true,
      },
    });

    if (matchingProducts.length > 0) {
      await this.prisma.recallRecipient.createMany({
        data: matchingProducts.map((p) => ({
          recallNoticeId: recallId,
          customerUserId: p.customerUserId,
          customerProductId: p.id,
          notifiedAt: now,
        })),
        skipDuplicates: true,
      });
    }

    return {
      notice: publishedNotice,
      targetCount: matchingProducts.length,
    };
  }

  public async listBusinessRecalls(auth: BusinessAuthorizationContext) {
    const recalls = await this.prisma.recallNotice.findMany({
      where: { businessId: auth.businessId },
      include: {
        affectedBrand: true,
        _count: { select: { recipients: true, acknowledgements: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return recalls.map((r) => ({
      ...r,
      recipientCount: r._count.recipients,
      acknowledgementCount: r._count.acknowledgements,
    }));
  }

  public async listCustomerRecalls(userId: string) {
    const recipients = await this.prisma.recallRecipient.findMany({
      where: { customerUserId: userId },
      include: {
        recallNotice: {
          include: {
            business: { select: { id: true, name: true } },
            acknowledgements: { where: { customerUserId: userId } },
          },
        },
        customerProduct: { select: { id: true, productName: true, modelNumber: true } },
      },
      orderBy: { notifiedAt: 'desc' },
    });

    return recipients.map((r) => ({
      id: r.recallNotice.id,
      publicReferenceNumber: r.recallNotice.publicReferenceNumber,
      title: r.recallNotice.title,
      businessName: r.recallNotice.business.name,
      severity: r.recallNotice.severity,
      noticeType: r.recallNotice.noticeType,
      productName: r.customerProduct.productName,
      modelNumber: r.customerProduct.modelNumber,
      publishedAt: r.recallNotice.publishedAt?.toISOString() ?? null,
      acknowledgedAt: r.recallNotice.acknowledgements[0]?.acknowledgedAt.toISOString() ?? null,
    }));
  }

  public async getCustomerRecallById(userId: string, recallId: string) {
    const recipient = await this.prisma.recallRecipient.findFirst({
      where: { recallNoticeId: recallId, customerUserId: userId },
      include: {
        recallNotice: {
          include: {
            business: { select: { id: true, name: true, phone: true, email: true } },
            acknowledgements: { where: { customerUserId: userId } },
          },
        },
        customerProduct: true,
      },
    });

    if (!recipient) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Recall notice not found for your account', statusCode: 404 });
    }

    const { recallNotice, customerProduct } = recipient;
    return {
      id: recallNotice.id,
      publicReferenceNumber: recallNotice.publicReferenceNumber,
      title: recallNotice.title,
      severity: recallNotice.severity,
      noticeType: recallNotice.noticeType,
      description: recallNotice.description,
      customerInstructions: recallNotice.customerInstructions,
      publishedAt: recallNotice.publishedAt?.toISOString() ?? null,
      businessName: recallNotice.business.name,
      businessContact: { phone: recallNotice.business.phone, email: recallNotice.business.email },
      affectedProduct: {
        name: customerProduct.productName,
        modelNumber: customerProduct.modelNumber,
        serialNumber: customerProduct.serialNumber,
      },
      acknowledgedAt: recallNotice.acknowledgements[0]?.acknowledgedAt.toISOString() ?? null,
    };
  }

  public async acknowledgeRecall(userId: string, recallId: string, input: AcknowledgeRecallInput) {
    const recipient = await this.prisma.recallRecipient.findFirst({
      where: { recallNoticeId: recallId, customerUserId: userId },
    });

    if (!recipient) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Recall notice recipient record not found', statusCode: 404 });
    }

    const ack = await this.prisma.recallAcknowledgement.upsert({
      where: {
        recallNoticeId_customerUserId: {
          recallNoticeId: recallId,
          customerUserId: userId,
        },
      },
      update: {
        notes: input.notes ?? null,
      },
      create: {
        recallNoticeId: recallId,
        customerUserId: userId,
        notes: input.notes ?? null,
      },
    });

    return ack;
  }
}
