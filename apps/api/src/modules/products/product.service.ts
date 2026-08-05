import type { ProductDto } from '@warrantypass/shared';
import type { CreateProductInput, UpdateProductInput } from '@warrantypass/validation';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AppConfig } from '../../config/env.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import type { AuditWriter, BusinessAuthorizationContext } from '../../common/security/contracts.js';
import type { RequestMetadata } from '../../common/security/request-metadata.js';

export class ProductService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly audit: AuditWriter,
  ) {}

  public async listProducts(
    context: BusinessAuthorizationContext,
    options?: { search?: string; categoryId?: string; brandId?: string; status?: string },
  ): Promise<ProductDto[]> {
    const where: any = {
      businessId: context.businessId,
      deletedAt: null,
    };

    if (options?.status) {
      where.status = options.status;
    } else {
      where.status = { not: 'ARCHIVED' };
    }

    if (options?.categoryId) where.categoryId = options.categoryId;
    if (options?.brandId) where.brandId = options.brandId;
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { modelNumber: { contains: options.search, mode: 'insensitive' } },
        { sku: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.catalogProduct.findMany({
      where,
      include: {
        brand: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => this.mapProductDto(p));
  }

  public async getProductById(
    context: BusinessAuthorizationContext,
    productId: string,
  ): Promise<ProductDto> {
    const product = await this.prisma.catalogProduct.findFirst({
      where: {
        id: productId,
        businessId: context.businessId,
        deletedAt: null,
      },
      include: {
        brand: true,
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Business product not found');
    }

    return this.mapProductDto(product);
  }

  public async createProduct(
    context: BusinessAuthorizationContext,
    input: CreateProductInput,
    metadata: RequestMetadata,
  ): Promise<ProductDto> {
    // Validate category exists
    const category = await this.prisma.productCategory.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid product category ID', statusCode: 400 });
    }

    if (input.brandId) {
      const brand = await this.prisma.productBrand.findUnique({
        where: { id: input.brandId },
      });
      if (!brand) {
        throw new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid product brand ID', statusCode: 400 });
      }
    }

    const product = await this.prisma.catalogProduct.create({
      data: {
        businessId: context.businessId,
        brandId: input.brandId ?? null,
        categoryId: input.categoryId,
        name: input.name,
        modelNumber: input.modelNumber ?? null,
        sku: input.sku ?? null,
        description: input.description ?? null,
        productImageFileId: input.productImageFileId ?? null,
        defaultWarrantyDuration: input.defaultWarrantyDuration ?? null,
        defaultWarrantyDurationUnit: input.defaultWarrantyDurationUnit ?? null,
        defaultCoverageType: input.defaultCoverageType ?? null,
        status: input.status ?? 'ACTIVE',
        createdByUserId: context.userId,
      },
      include: {
        brand: true,
        category: true,
      },
    });

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'product.created',
      resourceType: 'CatalogProduct',
      resourceId: product.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { name: product.name, modelNumber: product.modelNumber },
    });

    return this.mapProductDto(product);
  }

  public async updateProduct(
    context: BusinessAuthorizationContext,
    productId: string,
    input: UpdateProductInput,
    metadata: RequestMetadata,
  ): Promise<ProductDto> {
    const existing = await this.prisma.catalogProduct.findFirst({
      where: { id: productId, businessId: context.businessId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Business product not found');
    }

    const updated = await this.prisma.catalogProduct.update({
      where: { id: productId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.modelNumber !== undefined ? { modelNumber: input.modelNumber } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.productImageFileId !== undefined ? { productImageFileId: input.productImageFileId } : {}),
        ...(input.defaultWarrantyDuration !== undefined ? { defaultWarrantyDuration: input.defaultWarrantyDuration } : {}),
        ...(input.defaultWarrantyDurationUnit !== undefined ? { defaultWarrantyDurationUnit: input.defaultWarrantyDurationUnit } : {}),
        ...(input.defaultCoverageType !== undefined ? { defaultCoverageType: input.defaultCoverageType } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: {
        brand: true,
        category: true,
      },
    });

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'product.updated',
      resourceType: 'CatalogProduct',
      resourceId: productId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { changes: Object.keys(input).join(',') },
    });

    return this.mapProductDto(updated);
  }

  public async archiveProduct(
    context: BusinessAuthorizationContext,
    productId: string,
    metadata: RequestMetadata,
  ): Promise<ProductDto> {
    const existing = await this.prisma.catalogProduct.findFirst({
      where: { id: productId, businessId: context.businessId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Business product not found');
    }

    const archived = await this.prisma.catalogProduct.update({
      where: { id: productId },
      data: {
        status: 'ARCHIVED',
        deletedAt: new Date(),
      },
      include: {
        brand: true,
        category: true,
      },
    });

    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'product.archived',
      resourceType: 'CatalogProduct',
      resourceId: productId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { name: archived.name },
    });

    return this.mapProductDto(archived);
  }

  private mapProductDto(product: any): ProductDto {
    return {
      id: product.id,
      businessId: product.businessId,
      brandId: product.brandId,
      brandName: product.brand?.name ?? null,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      name: product.name,
      modelNumber: product.modelNumber,
      sku: product.sku,
      description: product.description,
      productImageFileId: product.productImageFileId,
      defaultWarrantyDuration: product.defaultWarrantyDuration,
      defaultWarrantyDurationUnit: product.defaultWarrantyDurationUnit,
      defaultCoverageType: product.defaultCoverageType,
      status: product.status,
      createdByUserId: product.createdByUserId,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
