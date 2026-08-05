import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BusinessAuthorizationContext } from '../../common/security/contracts.js';
import { AppError } from '../../common/errors/app-error.js';
import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import type {
  CreateServiceCenterInput,
  UpdateServiceCenterInput,
  AssignClaimServiceCenterInput,
} from '@warrantypass/validation';

export class ServiceCenterService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createServiceCenter(
    auth: BusinessAuthorizationContext,
    input: CreateServiceCenterInput
  ) {
    if (!auth.permissions.has(BUSINESS_PERMISSIONS.SERVICE_CENTERS_CREATE) && !auth.isOwner) {
      throw new AppError({ code: 'BUSINESS_PERMISSION_DENIED', message: 'Permission denied', statusCode: 403 });
    }

    const existing = await this.prisma.serviceCenter.findUnique({
      where: {
        businessId_serviceCenterCode: {
          businessId: auth.businessId,
          serviceCenterCode: input.serviceCenterCode,
        },
      },
    });

    if (existing) {
      throw new AppError({ code: 'CONFLICT', message: 'Service center code already exists for this business', statusCode: 409 });
    }

    const serviceCenter = await this.prisma.serviceCenter.create({
      data: {
        businessId: auth.businessId,
        name: input.name,
        serviceCenterCode: input.serviceCenterCode,
        phone: input.phone,
        email: input.email ?? null,
        addressLine: input.addressLine,
        area: input.area,
        district: input.district,
        division: input.division,
        postalCode: input.postalCode ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        openingHours: input.openingHours,
        serviceInstructions: input.serviceInstructions ?? null,
        status: input.status,
        createdByUserId: auth.userId,
        ...(input.supportedCategoryIds?.length
          ? {
              supportedCategories: {
                createMany: {
                  data: input.supportedCategoryIds.map((id) => ({ productCategoryId: id })),
                },
              },
            }
          : {}),
        ...(input.supportedBrandIds?.length
          ? {
              supportedBrands: {
                createMany: {
                  data: input.supportedBrandIds.map((id) => ({ productBrandId: id })),
                },
              },
            }
          : {}),
      },
      include: {
        supportedCategories: { include: { productCategory: true } },
        supportedBrands: { include: { productBrand: true } },
      },
    });

    return serviceCenter;
  }

  public async listBusinessServiceCenters(auth: BusinessAuthorizationContext) {
    const centers = await this.prisma.serviceCenter.findMany({
      where: {
        businessId: auth.businessId,
        deletedAt: null,
      },
      include: {
        supportedCategories: { include: { productCategory: true } },
        supportedBrands: { include: { productBrand: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return centers.map((c: any) => ({
      ...c,
      supportedCategories: c.supportedCategories.map((sc: any) => sc.productCategory),
      supportedBrands: c.supportedBrands.map((sb: any) => sb.productBrand),
      memberCount: c._count.members,
    }));
  }

  public async getServiceCenterById(auth: BusinessAuthorizationContext, serviceCenterId: string) {
    const center = await this.prisma.serviceCenter.findFirst({
      where: {
        id: serviceCenterId,
        businessId: auth.businessId,
        deletedAt: null,
      },
      include: {
        supportedCategories: { include: { productCategory: true } },
        supportedBrands: { include: { productBrand: true } },
        members: { include: { businessMember: { include: { user: true } } } },
      },
    });

    if (!center) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Service center not found', statusCode: 404 });
    }

    return {
      ...center,
      supportedCategories: center.supportedCategories.map((sc: any) => sc.productCategory),
      supportedBrands: center.supportedBrands.map((sb: any) => sb.productBrand),
    };
  }

  public async updateServiceCenter(
    auth: BusinessAuthorizationContext,
    serviceCenterId: string,
    input: UpdateServiceCenterInput
  ) {
    const center = await this.prisma.serviceCenter.findFirst({
      where: { id: serviceCenterId, businessId: auth.businessId, deletedAt: null },
    });

    if (!center) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Service center not found', statusCode: 404 });
    }

    const updated = await this.prisma.serviceCenter.update({
      where: { id: serviceCenterId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.addressLine ? { addressLine: input.addressLine } : {}),
        ...(input.area ? { area: input.area } : {}),
        ...(input.district ? { district: input.district } : {}),
        ...(input.division ? { division: input.division } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.openingHours ? { openingHours: input.openingHours } : {}),
        ...(input.serviceInstructions !== undefined ? { serviceInstructions: input.serviceInstructions } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });

    return updated;
  }

  public async searchCustomerServiceCenters(filters: {
    district?: string;
    division?: string;
    area?: string;
    search?: string;
  }) {
    const centers = await this.prisma.serviceCenter.findMany({
      where: {
        status: 'ACTIVE',
        business: { status: 'VERIFIED' },
        deletedAt: null,
        ...(filters.division ? { division: { equals: filters.division, mode: 'insensitive' } } : {}),
        ...(filters.district ? { district: { equals: filters.district, mode: 'insensitive' } } : {}),
        ...(filters.area ? { area: { equals: filters.area, mode: 'insensitive' } } : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { business: { name: { contains: filters.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        business: { select: { id: true, name: true, slug: true } },
        supportedCategories: { include: { productCategory: true } },
        supportedBrands: { include: { productBrand: true } },
      },
      orderBy: { name: 'asc' },
    });

    return centers.map((c: any) => ({
      id: c.id,
      businessId: c.businessId,
      businessName: c.business.name,
      name: c.name,
      serviceCenterCode: c.serviceCenterCode,
      phone: c.phone,
      email: c.email,
      addressLine: c.addressLine,
      area: c.area,
      district: c.district,
      division: c.division,
      postalCode: c.postalCode,
      latitude: c.latitude,
      longitude: c.longitude,
      openingHours: c.openingHours,
      serviceInstructions: c.serviceInstructions,
      status: c.status,
      supportedCategories: c.supportedCategories.map((sc: any) => sc.productCategory),
      supportedBrands: c.supportedBrands.map((sb: any) => sb.productBrand),
    }));
  }

  public async assignServiceCenterToClaim(
    auth: BusinessAuthorizationContext,
    claimId: string,
    input: AssignClaimServiceCenterInput
  ) {
    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, businessId: auth.businessId, deletedAt: null },
    });

    if (!claim) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Claim not found', statusCode: 404 });
    }

    const center = await this.prisma.serviceCenter.findFirst({
      where: { id: input.serviceCenterId, businessId: auth.businessId, status: 'ACTIVE', deletedAt: null },
    });

    if (!center) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid or inactive service center selected for this business', statusCode: 400 });
    }

    const assignment = await this.prisma.claimServiceCenterAssignment.create({
      data: {
        claimId,
        serviceCenterId: input.serviceCenterId,
        assignedByUserId: auth.userId,
        assignmentReason: input.assignmentReason ?? null,
      },
    });

    if (['APPROVED', 'UNDER_REVIEW'].includes(claim.status)) {
      await this.prisma.warrantyClaim.update({
        where: { id: claimId },
        data: { status: 'ASSIGNED' },
      });

      await this.prisma.claimStatusHistory.create({
        data: {
          claimId,
          fromStatus: claim.status,
          toStatus: 'ASSIGNED',
          changedByUserId: auth.userId,
          publicNote: `Claim assigned to service center: ${center.name}`,
          internalNote: `Assigned to ${center.name} (${center.serviceCenterCode})`,
        },
      });
    }

    return assignment;
  }
}
