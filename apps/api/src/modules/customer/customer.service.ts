import { createHash, randomUUID } from 'node:crypto';

import type {
  CustomerDashboardDto,
  CustomerDocumentDto,
  CustomerPaymentDto,
  CustomerProductDetailDto,
  CustomerProductListItemDto,
  CustomerSubscriptionDto,
  CustomerWarrantyDetailDto,
  CustomerWarrantySummaryDto,
  DocumentExtractionDto,
  PaginatedDto,
  WarrantyVerificationStatusDto,
} from '@warrantypass/shared';
import { USER_UPLOADED_WARRANTY_LABEL } from '@warrantypass/shared';
import type {
  CustomerListQuery,
  ManualProductCreateInput,
  ManualProductUpdateInput,
} from '@warrantypass/validation';

import type { AppConfig } from '../../config/env.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import type { AuditEvent, AuditWriter } from '../../common/security/contracts.js';
import type { StorageProvider } from '../../infrastructure/storage/storage-provider.js';
import type { BillingProvider } from './billing.provider.js';
import type { DocumentExtractionProvider } from './document-extraction.provider.js';
import {
  MANUAL_VAULT_PLAN_KEY,
  hasManualVaultEntitlement,
  requireManualVaultEntitlement,
} from './entitlement.service.js';
import { validateWarrantyFile } from './file-security.js';
import {
  addWarrantyDuration,
  calculateWarrantyStatus,
  formatDateOnly,
  maskSerialNumber,
  parseDateOnly,
  remainingDays,
} from './warranty-status.js';

const USER_UPLOAD_EXPLANATION =
  'This information was added by the customer and has not been verified by the original company.';
const VERIFIED_EXPLANATION =
  'This warranty was issued or confirmed by a verified WarrantyPass business.';

const productInclude = {
  brand: true,
  category: true,
  warranties: {
    where: { deletedAt: null },
    include: { issuerBusiness: true, documents: { where: { deletedAt: null } } },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.CustomerProductInclude;

export class CustomerService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly storage: StorageProvider,
    private readonly extraction: DocumentExtractionProvider,
    private readonly billing: BillingProvider,
    private readonly audit: AuditWriter,
  ) {}

  public async dashboard(userId: string): Promise<CustomerDashboardDto> {
    const products = await this.prisma.customerProduct.findMany({
      where: { customerUserId: userId, deletedAt: null },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });
    const summaries = products.flatMap((product) =>
      product.warranties.map((warranty) => this.warrantySummary(warranty)),
    );
    const recentDocuments = await this.prisma.warrantyDocument.findMany({
      where: { warranty: { customerUserId: userId }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    return {
      profileCompletion: profile?.displayName ? (profile.phone ? 100 : 75) : 40,
      counts: {
        products: products.length,
        warranties: summaries.length,
        active: summaries.filter((item) => item.operationalStatus === 'ACTIVE').length,
        expiringSoon: summaries.filter((item) => item.operationalStatus === 'EXPIRING_SOON').length,
        expired: summaries.filter((item) => item.operationalStatus === 'EXPIRED').length,
        verified: summaries.filter((item) => item.verificationStatus === 'VERIFIED_BY_BUSINESS')
          .length,
        userUploaded: summaries.filter((item) => item.source === 'USER_UPLOADED').length,
      },
      recentProducts: products.slice(0, 5).map((product) => this.productListItem(product)),
      recentDocuments: recentDocuments.map(mapDocument),
      manualVaultEntitled: await hasManualVaultEntitlement(this.prisma, userId),
    };
  }

  public async listProducts(
    userId: string,
    query: CustomerListQuery,
  ): Promise<PaginatedDto<CustomerProductListItemDto>> {
    const where = this.productWhere(userId, query);
    const orderBy = productOrderBy(query.sort);
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.customerProduct.findMany({
        where,
        include: productInclude,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.customerProduct.count({ where }),
    ]);
    return page(
      items.map((item) => this.productListItem(item)),
      query,
      totalItems,
    );
  }

  public async getProduct(userId: string, id: string): Promise<CustomerProductDetailDto> {
    const product = await this.prisma.customerProduct.findFirst({
      where: { id, customerUserId: userId, deletedAt: null },
      include: productInclude,
    });
    if (!product) throw new NotFoundError();
    const warranties = product.warranties.map((warranty) => this.warrantyDetail(warranty, product));
    return {
      ...this.productListItem(product),
      serialNumber: product.serialNumber,
      nickname: product.nickname,
      notes: product.notes,
      warranties,
      documents: warranties.flatMap((warranty) => warranty.documents),
    };
  }

  public async listWarranties(
    userId: string,
    query: CustomerListQuery,
  ): Promise<PaginatedDto<CustomerWarrantyDetailDto>> {
    const where: Prisma.WarrantyWhereInput = {
      customerUserId: userId,
      deletedAt: null,
      customerProduct: { is: this.productWhere(userId, query) },
      ...(query.verificationStatus ? { verificationLabel: query.verificationStatus } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...dateRange('endDate', query.endFrom, query.endTo),
      ...warrantyStatusWhere(query.status, this.config.WARRANTY_EXPIRING_SOON_DAYS),
    };
    const orderBy = warrantyOrderBy(query.sort);
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.warranty.findMany({
        where,
        include: {
          issuerBusiness: true,
          documents: { where: { deletedAt: null } },
          customerProduct: { include: { brand: true, category: true } },
        },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.warranty.count({ where }),
    ]);
    return page(
      items
        .filter((item) => item.customerProduct)
        .map((item) => this.warrantyDetail(item, item.customerProduct!)),
      query,
      totalItems,
    );
  }

  public async getWarranty(userId: string, id: string): Promise<CustomerWarrantyDetailDto> {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id, customerUserId: userId, deletedAt: null, customerProduct: { isNot: null } },
      include: {
        issuerBusiness: true,
        documents: { where: { deletedAt: null } },
        customerProduct: { include: { brand: true, category: true } },
      },
    });
    if (!warranty?.customerProduct) throw new NotFoundError();
    return this.warrantyDetail(warranty, warranty.customerProduct);
  }

  public async createManual(userId: string, input: ManualProductCreateInput) {
    await requireManualVaultEntitlement(this.prisma, userId);
    const endDate = resolveEndDate(input);
    const result = await this.prisma.$transaction(async (transaction) => {
      const product = await transaction.customerProduct.create({
        data: {
          customerUserId: userId,
          categoryId: input.categoryId,
          productName: input.productName,
          purchaseDate: parseDateOnly(input.purchaseDate),
          sellerName: input.sellerName,
          sourceType: 'USER_UPLOADED',
          ...(input.brandId ? { brandId: input.brandId } : {}),
          ...(input.modelNumber ? { modelNumber: input.modelNumber } : {}),
          ...(input.serialNumber ? { serialNumber: input.serialNumber } : {}),
          ...(input.nickname ? { nickname: input.nickname } : {}),
          ...(input.notes ? { notes: input.notes } : {}),
        },
      });
      const warranty = await transaction.warranty.create({
        data: {
          customerUserId: userId,
          customerProductId: product.id,
          source: 'USER_UPLOADED',
          verificationLabel: 'USER_UPLOADED',
          status: 'ACTIVE',
          purchaseDate: parseDateOnly(input.purchaseDate),
          issueDate: parseDateOnly(input.warrantyStartDate),
          startDate: parseDateOnly(input.warrantyStartDate),
          ...(input.warrantyNumber ? { warrantyNumber: input.warrantyNumber } : {}),
          ...(input.serialNumber ? { serialNumber: input.serialNumber } : {}),
          ...(endDate ? { endDate: parseDateOnly(endDate) } : {}),
          ...(input.warrantyDurationValue ? { durationValue: input.warrantyDurationValue } : {}),
          ...(input.warrantyDurationUnit ? { durationUnit: input.warrantyDurationUnit } : {}),
          ...(input.coverageType ? { coverageType: input.coverageType } : {}),
          ...(input.termsSummary ? { termsSummary: input.termsSummary } : {}),
        },
      });
      return { productId: product.id, warrantyId: warranty.id };
    });
    await this.record({
      actorUserId: userId,
      action: 'customer.manual_product.created',
      resourceType: 'CustomerProduct',
      resourceId: result.productId,
    });
    return { ...result, verificationLabel: USER_UPLOADED_WARRANTY_LABEL };
  }

  public async updateManual(userId: string, id: string, input: ManualProductUpdateInput) {
    const existing = await this.prisma.customerProduct.findFirst({
      where: { id, customerUserId: userId, deletedAt: null },
      include: { warranties: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
    });
    if (!existing) throw new NotFoundError();
    if (
      existing.sourceType !== 'USER_UPLOADED' ||
      existing.warranties.some((warranty) => warranty.source !== 'USER_UPLOADED')
    ) {
      throw new AppError({
        code: 'OFFICIAL_WARRANTY_READ_ONLY',
        message: 'Business-issued warranty fields cannot be edited by customers.',
        statusCode: 403,
      });
    }
    const warranty = existing.warranties[0];
    if (!warranty) throw new NotFoundError();
    const mergedStart = input.warrantyStartDate ?? formatDateOnly(warranty.startDate);
    const mergedDurationValue = input.warrantyDurationValue ?? warranty.durationValue ?? undefined;
    const mergedDurationUnit = input.warrantyDurationUnit ?? warranty.durationUnit ?? undefined;
    const endDate =
      input.warrantyEndDate ??
      (mergedStart && mergedDurationValue && mergedDurationUnit
        ? addWarrantyDuration(mergedStart, mergedDurationValue, mergedDurationUnit)
        : formatDateOnly(warranty.endDate));
    await this.prisma.$transaction([
      this.prisma.customerProduct.update({
        where: { id },
        data: {
          ...(input.productName !== undefined ? { productName: input.productName } : {}),
          ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.modelNumber !== undefined ? { modelNumber: input.modelNumber } : {}),
          ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
          ...(input.purchaseDate ? { purchaseDate: parseDateOnly(input.purchaseDate) } : {}),
          ...(input.sellerName !== undefined ? { sellerName: input.sellerName } : {}),
          ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      }),
      this.prisma.warranty.update({
        where: { id: warranty.id },
        data: {
          ...(input.warrantyNumber !== undefined ? { warrantyNumber: input.warrantyNumber } : {}),
          ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
          ...(input.warrantyStartDate ? { startDate: parseDateOnly(input.warrantyStartDate) } : {}),
          ...(endDate ? { endDate: parseDateOnly(endDate) } : {}),
          ...(input.warrantyDurationValue !== undefined
            ? { durationValue: input.warrantyDurationValue }
            : {}),
          ...(input.warrantyDurationUnit !== undefined
            ? { durationUnit: input.warrantyDurationUnit }
            : {}),
          ...(input.coverageType !== undefined ? { coverageType: input.coverageType } : {}),
          ...(input.termsSummary !== undefined ? { termsSummary: input.termsSummary } : {}),
        },
      }),
    ]);
    await this.record({
      actorUserId: userId,
      action: 'customer.manual_product.updated',
      resourceType: 'CustomerProduct',
      resourceId: id,
    });
    return this.getProduct(userId, id);
  }

  public async archiveManual(userId: string, id: string): Promise<void> {
    const product = await this.prisma.customerProduct.findFirst({
      where: { id, customerUserId: userId, deletedAt: null, sourceType: 'USER_UPLOADED' },
    });
    if (!product) throw new NotFoundError();
    await this.prisma.customerProduct.update({
      where: { id },
      data: { ownershipStatus: 'ARCHIVED', deletedAt: new Date() },
    });
    await this.record({
      actorUserId: userId,
      action: 'customer.manual_product.archived',
      resourceType: 'CustomerProduct',
      resourceId: id,
    });
  }

  public async uploadDocument(
    userId: string,
    productId: string,
    kind: 'WARRANTY_CARD' | 'INVOICE' | 'RECEIPT' | 'PRODUCT_IMAGE' | 'OTHER',
    file: Express.Multer.File,
  ): Promise<CustomerDocumentDto> {
    await requireManualVaultEntitlement(this.prisma, userId);
    const product = await this.prisma.customerProduct.findFirst({
      where: {
        id: productId,
        customerUserId: userId,
        deletedAt: null,
        sourceType: 'USER_UPLOADED',
      },
      include: { warranties: { where: { deletedAt: null }, take: 1 } },
    });
    if (!product?.warranties[0]) throw new NotFoundError();
    const detected = await validateWarrantyFile(file);
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `warranty-document/${userId}/${randomUUID()}.${detected.extension}`;
    await this.storage.putObject({
      storageKey,
      contentType: detected.mimeType,
      body: file.buffer,
      checksumSha256: checksum,
    });
    try {
      const document = await this.prisma.warrantyDocument.create({
        data: {
          warrantyId: product.warranties[0].id,
          uploadedByUserId: userId,
          kind,
          storageKey,
          originalName: file.originalname.slice(0, 255),
          mimeType: detected.mimeType,
          sizeBytes: file.size,
          checksumSha256: checksum,
          isPrivate: true,
          scanStatus: 'PENDING_SCAN',
        },
      });
      return mapDocument(document);
    } catch (error) {
      await this.storage.delete(storageKey);
      throw error;
    }
  }

  public async readDocument(userId: string, id: string) {
    const document = await this.prisma.warrantyDocument.findFirst({
      where: { id, deletedAt: null, warranty: { customerUserId: userId, deletedAt: null } },
    });
    if (!document) throw new NotFoundError();
    if (document.scanStatus === 'REJECTED') {
      throw new AppError({
        code: 'DOCUMENT_QUARANTINED',
        message: 'This document is not available.',
        statusCode: 423,
      });
    }
    const object = await this.storage.readObject(document.storageKey);
    if (!object) throw new NotFoundError();
    return { body: object.body, mimeType: document.mimeType, displayName: document.originalName };
  }

  public async removeDocument(userId: string, id: string): Promise<void> {
    await requireManualVaultEntitlement(this.prisma, userId);
    const document = await this.prisma.warrantyDocument.findFirst({
      where: {
        id,
        deletedAt: null,
        warranty: {
          customerUserId: userId,
          source: 'USER_UPLOADED',
          customerProduct: { sourceType: 'USER_UPLOADED' },
        },
      },
    });
    if (!document) throw new NotFoundError();
    await this.prisma.warrantyDocument.update({
      where: { id },
      data: { deletedAt: new Date(), scanStatus: 'DELETED' },
    });
    await this.storage.delete(document.storageKey);
  }

  public async extractDocument(
    userId: string,
    file: Express.Multer.File,
  ): Promise<DocumentExtractionDto> {
    await requireManualVaultEntitlement(this.prisma, userId);
    const detected = await validateWarrantyFile(file);
    const sourceHash = createHash('sha256').update(file.buffer).digest('hex');
    const fields = await this.extraction.extract({
      content: file.buffer,
      mimeType: detected.mimeType,
    });
    const expiresAt = new Date(Date.now() + 30 * 60_000);
    const job = await this.prisma.documentExtractionJob.create({
      data: {
        customerUserId: userId,
        provider: this.extraction.name,
        status: 'COMPLETED',
        sourceMimeType: detected.mimeType,
        sourceHash,
        extractedFields: JSON.parse(JSON.stringify(fields)) as Prisma.InputJsonValue,
        expiresAt,
      },
    });
    return {
      id: job.id,
      status: 'COMPLETED',
      provider: job.provider,
      fields,
      expiresAt: expiresAt.toISOString(),
      warning: 'Extraction may be inaccurate. Review and correct every field before saving.',
    };
  }

  public async confirmExtraction(
    userId: string,
    id: string,
    fields: Record<string, string | undefined>,
  ): Promise<DocumentExtractionDto> {
    const job = await this.prisma.documentExtractionJob.findFirst({
      where: { id, customerUserId: userId, status: 'COMPLETED', expiresAt: { gt: new Date() } },
    });
    if (!job) throw new NotFoundError();
    await this.prisma.documentExtractionJob.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedFields: JSON.parse(JSON.stringify(fields)) as Prisma.InputJsonValue,
      },
    });
    return {
      id,
      status: 'CONFIRMED',
      provider: job.provider,
      fields: {},
      expiresAt: job.expiresAt.toISOString(),
      warning: 'The confirmed values are ready to copy into the manual warranty form.',
    };
  }

  public async subscription(userId: string): Promise<CustomerSubscriptionDto> {
    const plan = await this.getPlan();
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, ownerType: 'USER', planKey: MANUAL_VAULT_PLAN_KEY },
      orderBy: { createdAt: 'desc' },
    });
    return {
      entitled: await hasManualVaultEntitlement(this.prisma, userId),
      plan: {
        key: plan.key,
        name: plan.name,
        description: plan.description,
        amount: plan.amount.toFixed(2),
        currency: plan.currency,
        interval: plan.interval,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            status: normalizeSubscriptionStatus(subscription.status, subscription.currentPeriodEnd),
            currentPeriodStart: subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  public async checkout(userId: string): Promise<CustomerSubscriptionDto> {
    const plan = await this.getPlan();
    const checkout = await this.billing.checkout({
      userId,
      amount: plan.amount.toFixed(2),
      currency: plan.currency,
    });
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
    await this.prisma.$transaction(async (transaction) => {
      const subscription = await transaction.subscription.create({
        data: {
          ownerType: 'USER',
          userId,
          planKey: plan.key,
          planId: plan.id,
          status: 'ACTIVE',
          billingInterval: 'YEARLY',
          providerCustomerId: `mock_customer_${userId}`,
          providerSubscriptionId: `mock_subscription_${randomUUID()}`,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
      await transaction.payment.create({
        data: {
          subscriptionId: subscription.id,
          providerPaymentId: checkout.providerPaymentId,
          paymentReference: checkout.paymentReference,
          idempotencyKey: `checkout:${checkout.paymentReference}`,
          amount: plan.amount,
          currency: plan.currency,
          status: checkout.status,
          paidAt: now,
        },
      });
    });
    await this.record({
      actorUserId: userId,
      action: 'customer.subscription.activated',
      resourceType: 'Subscription',
    });
    return this.subscription(userId);
  }

  public async cancelSubscription(userId: string): Promise<CustomerSubscriptionDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        ownerType: 'USER',
        planKey: MANUAL_VAULT_PLAN_KEY,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) throw new NotFoundError();
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
    });
    return this.subscription(userId);
  }

  public async payments(userId: string): Promise<CustomerPaymentDto[]> {
    const payments = await this.prisma.payment.findMany({
      where: { subscription: { userId, ownerType: 'USER' } },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((payment) => ({
      id: payment.id,
      paymentReference: payment.paymentReference,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    }));
  }

  public async processWebhook(
    provider: string,
    rawBody: Buffer,
    signature: string | undefined,
    event: {
      id: string;
      type: 'subscription.activated' | 'subscription.expired' | 'payment.failed';
      data: { userId: string; paymentReference?: string };
    },
  ): Promise<{ duplicate: boolean }> {
    if (provider !== this.billing.name || !this.billing.verifyWebhook(rawBody, signature)) {
      throw new AppError({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'The webhook signature could not be verified.',
        statusCode: 401,
      });
    }
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    try {
      await this.prisma.billingEvent.create({
        data: {
          provider,
          providerEventId: event.id,
          eventType: event.type,
          payloadHash,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { duplicate: true };
      }
      throw error;
    }
    try {
      if (event.type === 'subscription.expired') {
        await this.prisma.subscription.updateMany({
          where: { userId: event.data.userId, planKey: MANUAL_VAULT_PLAN_KEY },
          data: { status: 'EXPIRED' },
        });
      }
      if (event.type === 'payment.failed') {
        await this.prisma.subscription.updateMany({
          where: { userId: event.data.userId, planKey: MANUAL_VAULT_PLAN_KEY, status: 'ACTIVE' },
          data: { status: 'PAST_DUE' },
        });
      }
      await this.prisma.billingEvent.update({
        where: { provider_providerEventId: { provider, providerEventId: event.id } },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      return { duplicate: false };
    } catch (error) {
      await this.prisma.billingEvent.update({
        where: { provider_providerEventId: { provider, providerEventId: event.id } },
        data: { status: 'FAILED', failureCode: 'PROCESSING_FAILED' },
      });
      throw error;
    }
  }

  public async catalog(kind: 'brands' | 'categories', search?: string) {
    const where = {
      deletedAt: null,
      isActive: true,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const items =
      kind === 'brands'
        ? await this.prisma.productBrand.findMany({ where, orderBy: { name: 'asc' }, take: 100 })
        : await this.prisma.productCategory.findMany({
            where,
            orderBy: { name: 'asc' },
            take: 100,
          });
    return items.map(({ id, name, slug }) => ({ id, name, slug }));
  }

  private productWhere(userId: string, query: CustomerListQuery): Prisma.CustomerProductWhereInput {
    const search = query.search;
    return {
      customerUserId: userId,
      deletedAt: null,
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.source ? { sourceType: query.source } : {}),
      ...dateRange('purchaseDate', query.purchaseFrom, query.purchaseTo),
      ...(search
        ? {
            OR: [
              { productName: { contains: search, mode: 'insensitive' } },
              { modelNumber: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
              { sellerName: { contains: search, mode: 'insensitive' } },
              { brand: { name: { contains: search, mode: 'insensitive' } } },
              {
                warranties: { some: { warrantyNumber: { contains: search, mode: 'insensitive' } } },
              },
            ],
          }
        : {}),
      ...(query.verificationStatus || query.status || query.endFrom || query.endTo
        ? {
            warranties: {
              some: {
                deletedAt: null,
                ...(query.verificationStatus
                  ? { verificationLabel: query.verificationStatus }
                  : {}),
                ...dateRange('endDate', query.endFrom, query.endTo),
                ...warrantyStatusWhere(query.status, this.config.WARRANTY_EXPIRING_SOON_DAYS),
              },
            },
          }
        : {}),
    };
  }

  private productListItem(
    product: Prisma.CustomerProductGetPayload<{ include: typeof productInclude }>,
  ): CustomerProductListItemDto {
    return {
      id: product.id,
      productName: product.productName,
      brand: product.brand ? pickOption(product.brand) : null,
      category: pickOption(product.category),
      modelNumber: product.modelNumber,
      maskedSerialNumber: maskSerialNumber(product.serialNumber),
      purchaseDate: formatDateOnly(product.purchaseDate)!,
      sellerName: product.sellerName,
      source: product.sourceType,
      ownershipStatus: product.ownershipStatus,
      warranty: product.warranties[0] ? this.warrantySummary(product.warranties[0]) : null,
      createdAt: product.createdAt.toISOString(),
    };
  }

  private warrantySummary(warranty: {
    id: string;
    warrantyNumber: string | null;
    source: string;
    verificationLabel: string;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
  }): CustomerWarrantySummaryDto {
    const verificationStatus = warranty.verificationLabel as WarrantyVerificationStatusDto;
    return {
      id: warranty.id,
      warrantyNumber: warranty.warrantyNumber,
      source: warranty.source as CustomerWarrantySummaryDto['source'],
      verificationStatus,
      verificationLabel:
        verificationStatus === 'USER_UPLOADED'
          ? USER_UPLOADED_WARRANTY_LABEL
          : verificationStatus === 'VERIFIED_BY_BUSINESS'
            ? 'Verified by Business'
            : titleCase(verificationStatus),
      operationalStatus: calculateWarrantyStatus({
        storedStatus: warranty.status,
        verificationStatus,
        startDate: warranty.startDate,
        endDate: warranty.endDate,
        expiringSoonDays: this.config.WARRANTY_EXPIRING_SOON_DAYS,
      }),
      startDate: formatDateOnly(warranty.startDate),
      endDate: formatDateOnly(warranty.endDate),
      remainingDays: remainingDays(warranty.endDate),
    };
  }

  private warrantyDetail(
    warranty: anyWarranty,
    product: anyCustomerProduct,
  ): CustomerWarrantyDetailDto {
    const summary = this.warrantySummary(warranty);
    return {
      ...summary,
      verificationLabel: `${summary.verificationLabel}. ${
        summary.verificationStatus === 'VERIFIED_BY_BUSINESS'
          ? VERIFIED_EXPLANATION
          : summary.verificationStatus === 'USER_UPLOADED'
            ? USER_UPLOAD_EXPLANATION
            : 'Verification is not complete.'
      }`,
      product: {
        id: product.id,
        productName: product.productName,
        brandName: product.brand?.name ?? null,
        categoryName: product.category.name,
        modelNumber: product.modelNumber,
        serialNumber: product.serialNumber,
        purchaseDate: formatDateOnly(product.purchaseDate)!,
        sellerName: product.sellerName,
      },
      issuingBusiness: warranty.issuerBusiness
        ? { id: warranty.issuerBusiness.id, name: warranty.issuerBusiness.name }
        : null,
      durationValue: warranty.durationValue,
      durationUnit: warranty.durationUnit,
      coverageType: warranty.coverageType,
      termsSummary: warranty.termsSummary,
      documents: warranty.documents.map(mapDocument),
      createdAt: warranty.createdAt.toISOString(),
    };
  }

  private async getPlan() {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { key: MANUAL_VAULT_PLAN_KEY },
    });
    if (!plan?.isActive) {
      throw new AppError({
        code: 'PLAN_UNAVAILABLE',
        message: 'The Manual Warranty Vault plan is temporarily unavailable.',
        statusCode: 503,
      });
    }
    return plan;
  }

  private async record(event: AuditEvent): Promise<void> {
    await this.audit.write(event);
  }
}

type anyWarranty = Prisma.WarrantyGetPayload<{
  include: { issuerBusiness: true; documents: true };
}>;
type anyCustomerProduct = Prisma.CustomerProductGetPayload<{
  include: { brand: true; category: true };
}>;

function mapDocument(document: {
  id: string;
  kind: CustomerDocumentDto['kind'];
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: CustomerDocumentDto['scanStatus'];
  createdAt: Date;
}): CustomerDocumentDto {
  return {
    id: document.id,
    kind: document.kind,
    displayName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    scanStatus: document.scanStatus,
    createdAt: document.createdAt.toISOString(),
  };
}

function pickOption(value: { id: string; name: string; slug: string }) {
  return { id: value.id, name: value.name, slug: value.slug };
}

function resolveEndDate(input: ManualProductCreateInput): string | undefined {
  if (input.warrantyEndDate) return input.warrantyEndDate;
  if (input.warrantyDurationValue && input.warrantyDurationUnit) {
    return addWarrantyDuration(
      input.warrantyStartDate,
      input.warrantyDurationValue,
      input.warrantyDurationUnit,
    );
  }
  return undefined;
}

function page<T>(
  items: T[],
  query: Pick<CustomerListQuery, 'page' | 'pageSize'>,
  totalItems: number,
): PaginatedDto<T> {
  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    },
  };
}

function productOrderBy(
  sort: CustomerListQuery['sort'],
): Prisma.CustomerProductOrderByWithRelationInput {
  const values: Record<CustomerListQuery['sort'], Prisma.CustomerProductOrderByWithRelationInput> =
    {
      recent: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      endingSoon: { warranties: { _count: 'desc' } },
      endingLater: { warranties: { _count: 'asc' } },
      productName: { productName: 'asc' },
      brand: { brand: { name: 'asc' } },
      purchaseDate: { purchaseDate: 'desc' },
    };
  return values[sort];
}

function warrantyOrderBy(sort: CustomerListQuery['sort']): Prisma.WarrantyOrderByWithRelationInput {
  const values: Record<CustomerListQuery['sort'], Prisma.WarrantyOrderByWithRelationInput> = {
    recent: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    endingSoon: { endDate: { sort: 'asc', nulls: 'last' } },
    endingLater: { endDate: { sort: 'desc', nulls: 'last' } },
    productName: { customerProduct: { productName: 'asc' } },
    brand: { customerProduct: { brand: { name: 'asc' } } },
    purchaseDate: { customerProduct: { purchaseDate: 'desc' } },
  };
  return values[sort];
}

function dateRange(
  field: 'purchaseDate' | 'endDate',
  from?: string,
  to?: string,
): Record<string, { gte?: Date; lte?: Date }> {
  return from || to
    ? {
        [field]: {
          ...(from ? { gte: parseDateOnly(from) } : {}),
          ...(to ? { lte: parseDateOnly(to) } : {}),
        },
      }
    : {};
}

function warrantyStatusWhere(
  status: CustomerListQuery['status'],
  expiringDays: number,
): Prisma.WarrantyWhereInput {
  if (!status) return {};
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setUTCDate(soon.getUTCDate() + expiringDays);
  if (status === 'REVOKED')
    return { OR: [{ status: 'REVOKED' }, { verificationLabel: 'REVOKED' }] };
  if (status === 'INVALID')
    return { OR: [{ status: 'INVALID' }, { verificationLabel: 'REJECTED' }] };
  if (status === 'VOIDED') return { status: 'VOIDED' };
  if (status === 'NOT_STARTED') return { startDate: { gt: today } };
  if (status === 'EXPIRED') return { endDate: { lt: today } };
  if (status === 'EXPIRING_SOON') {
    return {
      endDate: { gte: today, lte: soon },
      status: { notIn: ['REVOKED', 'INVALID', 'VOIDED'] },
    };
  }
  return {
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: today } }] },
      { OR: [{ endDate: null }, { endDate: { gt: soon } }] },
      { status: { notIn: ['REVOKED', 'INVALID', 'VOIDED'] } },
      { verificationLabel: { notIn: ['REVOKED', 'REJECTED'] } },
    ],
  };
}

type SubscriptionStatusDto = NonNullable<CustomerSubscriptionDto['subscription']>['status'];

function normalizeSubscriptionStatus(status: string, end: Date): SubscriptionStatusDto {
  const normalized =
    end <= new Date() && (status === 'ACTIVE' || status === 'TRIALING') ? 'EXPIRED' : status;
  if (normalized === 'PAUSED') return 'SUSPENDED';
  return normalized as SubscriptionStatusDto;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join(' ');
}
