import type { PrismaClient } from '../../generated/prisma/client.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';

export interface ClaimEligibilityResult {
  isEligible: boolean;
  warranty: any;
  reason?: string;
}

export class ClaimEligibilityService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async assertClaimEligibility(userId: string, warrantyId: string): Promise<any> {
    const warranty = await this.prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        customerUserId: userId,
        deletedAt: null,
      },
      include: {
        issuerBusiness: true,
        catalogProduct: true,
        customerProduct: true,
      },
    });

    if (!warranty) {
      throw new NotFoundError('Warranty not found or does not belong to user account');
    }

    if (warranty.source !== 'BUSINESS_ISSUED') {
      throw new AppError({
        code: 'CLAIM_NOT_ELIGIBLE',
        message: 'Claims cannot be submitted for user-uploaded warranties. Only business-verified warranties are eligible.',
        statusCode: 400,
      });
    }

    if (warranty.status === 'REVOKED') {
      throw new AppError({
        code: 'CLAIM_NOT_ELIGIBLE',
        message: 'Cannot submit a claim against a revoked warranty.',
        statusCode: 400,
      });
    }

    if (warranty.status === 'INVALID' || warranty.status === 'VOIDED') {
      throw new AppError({
        code: 'CLAIM_NOT_ELIGIBLE',
        message: 'Cannot submit a claim against an invalid or voided warranty.',
        statusCode: 400,
      });
    }

    if (!warranty.issuerBusiness || warranty.issuerBusiness.deletedAt) {
      throw new AppError({
        code: 'CLAIM_NOT_ELIGIBLE',
        message: 'The issuing business is no longer active.',
        statusCode: 400,
      });
    }

    if (warranty.endDate && new Date() > new Date(warranty.endDate) && warranty.status === 'EXPIRED') {
      throw new AppError({
        code: 'CLAIM_NOT_ELIGIBLE',
        message: 'Warranty coverage has expired. Claims cannot be submitted after coverage expiration.',
        statusCode: 400,
      });
    }

    return warranty;
  }
}
