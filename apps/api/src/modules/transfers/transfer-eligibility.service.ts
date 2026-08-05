import type { PrismaClient } from '../../generated/prisma/client.js';

export interface TransferEligibilityResult {
  isEligible: boolean;
  reasons: string[];
  customerProduct?: any;
  warranty?: any;
  policy?: any;
}

export class TransferEligibilityService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async evaluateEligibility(
    customerUserId: string,
    customerProductId: string
  ): Promise<TransferEligibilityResult> {
    const reasons: string[] = [];

    const product = await this.prisma.customerProduct.findFirst({
      where: { id: customerProductId, deletedAt: null },
      include: {
        warranties: {
          where: { status: 'ACTIVE', deletedAt: null },
          include: { issuerBusiness: true },
        },
      },
    });

    if (!product) {
      return { isEligible: false, reasons: ['Product record not found'] };
    }

    if (product.customerUserId !== customerUserId) {
      return { isEligible: false, reasons: ['Product does not belong to your customer account'] };
    }

    if (product.ownershipStatus !== 'ACTIVE') {
      return { isEligible: false, reasons: ['Product is not currently in ACTIVE ownership status'] };
    }

    const warranty = product.warranties[0];
    if (!warranty || !warranty.issuerBusinessId) {
      return { isEligible: false, reasons: ['No active business-issued warranty attached to product'] };
    }

    if (warranty.status !== 'ACTIVE') {
      return { isEligible: false, reasons: [`Warranty is currently ${warranty.status} and cannot be transferred`] };
    }

    const pendingTransfer = await this.prisma.ownershipTransfer.findFirst({
      where: {
        customerProductId,
        status: { in: ['PENDING_RECIPIENT', 'RECIPIENT_ACCEPTED', 'PENDING_BUSINESS_APPROVAL'] },
      },
    });

    if (pendingTransfer) {
      return { isEligible: false, reasons: ['An active ownership transfer request is already pending for this product'] };
    }

    let policy = await this.prisma.businessTransferPolicy.findUnique({
      where: { businessId: warranty.issuerBusinessId },
    });

    if (!policy) {
      policy = {
        id: 'default',
        businessId: warranty.issuerBusinessId,
        isTransferAllowed: true,
        requireBusinessApproval: true,
        maxTransfersPerWarranty: 3,
        minRemainingDaysRequired: 30,
        transferRepairHistoryAllowed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (!policy.isTransferAllowed) {
      reasons.push('The issuing business policy does not allow warranty transfers for this product');
    }

    if (warranty.endDate) {
      const daysRemaining = Math.ceil((new Date(warranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < policy.minRemainingDaysRequired) {
        reasons.push(`Minimum remaining warranty period required by issuer is ${policy.minRemainingDaysRequired} days (${daysRemaining} days remaining)`);
      }
    }

    const completedCount = await this.prisma.ownershipTransfer.count({
      where: {
        warrantyId: warranty.id,
        status: 'COMPLETED',
      },
    });

    if (completedCount >= policy.maxTransfersPerWarranty) {
      reasons.push(`Maximum allowed transfers (${policy.maxTransfersPerWarranty}) reached for this warranty`);
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
      customerProduct: product,
      warranty,
      policy,
    };
  }
}
