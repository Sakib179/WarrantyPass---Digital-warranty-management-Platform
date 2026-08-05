import type { BusinessSubscriptionEntitlementDto } from '@warrantypass/shared';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../../common/errors/app-error.js';

export class SubscriptionEntitlementService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getBusinessEntitlement(businessId: string): Promise<BusinessSubscriptionEntitlementDto> {
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        businessId,
        ownerType: 'BUSINESS',
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      include: {
        plan: {
          include: {
            entitlement: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const planKey = activeSub?.planKey ?? 'business-starter';
    const planName = activeSub?.plan?.name ?? 'Business Starter';
    const status = activeSub?.status ?? 'ACTIVE';

    const maxWarrantiesPerMonth = activeSub?.plan?.entitlement?.maxWarrantiesPerMonth ?? 100;
    const maxEmployees = activeSub?.plan?.entitlement?.maxEmployees ?? 10;
    const maxTemplates = activeSub?.plan?.entitlement?.maxTemplates ?? 10;
    const maxStorageMb = activeSub?.plan?.entitlement?.maxStorageMb ?? 2000;
    const claimManagementAccess = activeSub?.plan?.entitlement?.claimManagementAccess ?? true;

    const currentPeriodStart = activeSub?.currentPeriodStart ?? new Date(new Date().setDate(1));
    const currentPeriodEnd = activeSub?.currentPeriodEnd ?? new Date(new Date().setMonth(new Date().getMonth() + 1));

    const issuedWarrantiesThisMonth = await this.prisma.warranty.count({
      where: {
        issuerBusinessId: businessId,
        source: 'BUSINESS_ISSUED',
        createdAt: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd,
        },
      },
    });

    const currentEmployees = await this.prisma.businessMember.count({
      where: { businessId, status: 'ACTIVE', deletedAt: null },
    });

    const currentTemplates = await this.prisma.warrantyTemplate.count({
      where: { businessId, deletedAt: null },
    });

    const remainingWarrantiesThisMonth = Math.max(0, maxWarrantiesPerMonth - issuedWarrantiesThisMonth);

    return {
      planKey,
      planName,
      status,
      maxWarrantiesPerMonth,
      issuedWarrantiesThisMonth,
      remainingWarrantiesThisMonth,
      maxEmployees,
      currentEmployees,
      maxTemplates,
      currentTemplates,
      maxStorageMb,
      claimManagementAccess,
      currentPeriodStart: currentPeriodStart.toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString(),
    };
  }

  public async assertCanIssueWarranty(businessId: string): Promise<void> {
    const entitlement = await this.getBusinessEntitlement(businessId);
    if (entitlement.remainingWarrantiesThisMonth <= 0) {
      throw new AppError({
        code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
        message: `Monthly warranty issuance limit (${entitlement.maxWarrantiesPerMonth}) reached for plan "${entitlement.planName}". Please upgrade your subscription.`,
        statusCode: 403,
      });
    }
  }

  public async assertClaimManagementAccess(businessId: string): Promise<void> {
    const entitlement = await this.getBusinessEntitlement(businessId);
    if (!entitlement.claimManagementAccess) {
      throw new AppError({
        code: 'SUBSCRIPTION_FEATURE_NOT_ALLOWED',
        message: 'Claim management is not included in your current subscription plan.',
        statusCode: 403,
      });
    }
  }
}
