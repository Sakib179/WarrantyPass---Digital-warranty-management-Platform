import type { WarrantyTemplateDto } from '@warrantypass/shared';
import type { CreateWarrantyTemplateInput, UpdateWarrantyTemplateInput } from '@warrantypass/validation';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AppConfig } from '../../config/env.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import type { AuditWriter, BusinessAuthorizationContext } from '../../common/security/contracts.js';
import type { RequestMetadata } from '../../common/security/request-metadata.js';

export class WarrantyTemplateService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly audit: AuditWriter,
  ) {}

  public async listTemplates(
    context: BusinessAuthorizationContext,
  ): Promise<WarrantyTemplateDto[]> {
    const templates = await this.prisma.warrantyTemplate.findMany({
      where: {
        businessId: context.businessId,
        deletedAt: null,
      },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((t) => this.mapTemplateDto(t));
  }

  public async getTemplateById(
    context: BusinessAuthorizationContext,
    templateId: string,
  ): Promise<WarrantyTemplateDto> {
    const template = await this.prisma.warrantyTemplate.findFirst({
      where: {
        id: templateId,
        businessId: context.businessId,
        deletedAt: null,
      },
      include: {
        product: true,
      },
    });

    if (!template) {
      throw new NotFoundError('Warranty template not found');
    }

    return this.mapTemplateDto(template);
  }

  public async createTemplate(
    context: BusinessAuthorizationContext,
    input: CreateWarrantyTemplateInput,
    metadata: RequestMetadata,
  ): Promise<WarrantyTemplateDto> {
    const template = await this.prisma.$transaction(async (tx) => {
      const created = await tx.warrantyTemplate.create({
        data: {
          businessId: context.businessId,
          productId: input.productId ?? null,
          name: input.name,
          durationValue: input.durationValue,
          durationUnit: input.durationUnit,
          coverageType: input.coverageType,
          termsSummary: input.termsSummary,
          termsDocumentFileId: input.termsDocumentFileId ?? null,
          exclusions: input.exclusions ?? null,
          serviceInstructions: input.serviceInstructions ?? null,
          status: input.status ?? 'ACTIVE',
          version: 1,
          createdByUserId: context.userId,
        },
        include: { product: true },
      });

      // Snapshot version 1
      await tx.warrantyTemplateVersion.create({
        data: {
          templateId: created.id,
          version: 1,
          name: created.name,
          durationValue: created.durationValue,
          durationUnit: created.durationUnit,
          coverageType: created.coverageType,
          termsSummary: created.termsSummary,
          termsDocumentFileId: created.termsDocumentFileId,
          exclusions: created.exclusions,
          serviceInstructions: created.serviceInstructions,
        },
      });

      return created;
    });

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'warranty_template.created',
      resourceType: 'WarrantyTemplate',
      resourceId: template.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { name: template.name, version: 1 },
    });

    return this.mapTemplateDto(template);
  }

  public async updateTemplate(
    context: BusinessAuthorizationContext,
    templateId: string,
    input: UpdateWarrantyTemplateInput,
    metadata: RequestMetadata,
  ): Promise<WarrantyTemplateDto> {
    const existing = await this.prisma.warrantyTemplate.findFirst({
      where: { id: templateId, businessId: context.businessId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Warranty template not found');
    }

    const isMaterialChange =
      (input.durationValue !== undefined && input.durationValue !== existing.durationValue) ||
      (input.durationUnit !== undefined && input.durationUnit !== existing.durationUnit) ||
      (input.coverageType !== undefined && input.coverageType !== existing.coverageType) ||
      (input.termsSummary !== undefined && input.termsSummary !== existing.termsSummary);

    const nextVersion = isMaterialChange ? existing.version + 1 : existing.version;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.warrantyTemplate.update({
        where: { id: templateId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.productId !== undefined ? { productId: input.productId } : {}),
          ...(input.durationValue !== undefined ? { durationValue: input.durationValue } : {}),
          ...(input.durationUnit !== undefined ? { durationUnit: input.durationUnit } : {}),
          ...(input.coverageType !== undefined ? { coverageType: input.coverageType } : {}),
          ...(input.termsSummary !== undefined ? { termsSummary: input.termsSummary } : {}),
          ...(input.termsDocumentFileId !== undefined ? { termsDocumentFileId: input.termsDocumentFileId } : {}),
          ...(input.exclusions !== undefined ? { exclusions: input.exclusions } : {}),
          ...(input.serviceInstructions !== undefined ? { serviceInstructions: input.serviceInstructions } : {}),
          ...(input.status ? { status: input.status } : {}),
          version: nextVersion,
        },
        include: { product: true },
      });

      if (isMaterialChange) {
        await tx.warrantyTemplateVersion.create({
          data: {
            templateId: result.id,
            version: nextVersion,
            name: result.name,
            durationValue: result.durationValue,
            durationUnit: result.durationUnit,
            coverageType: result.coverageType,
            termsSummary: result.termsSummary,
            termsDocumentFileId: result.termsDocumentFileId,
            exclusions: result.exclusions,
            serviceInstructions: result.serviceInstructions,
          },
        });
      }

      return result;
    });

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'warranty_template.updated',
      resourceType: 'WarrantyTemplate',
      resourceId: templateId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { newVersion: nextVersion, isMaterialChange },
    });

    return this.mapTemplateDto(updated);
  }

  private mapTemplateDto(t: any): WarrantyTemplateDto {
    return {
      id: t.id,
      businessId: t.businessId,
      productId: t.productId,
      productName: t.product?.name ?? null,
      name: t.name,
      durationValue: t.durationValue,
      durationUnit: t.durationUnit,
      coverageType: t.coverageType,
      termsSummary: t.termsSummary,
      termsDocumentFileId: t.termsDocumentFileId,
      exclusions: t.exclusions,
      serviceInstructions: t.serviceInstructions,
      status: t.status,
      version: t.version,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
