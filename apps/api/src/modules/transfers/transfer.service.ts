import crypto from 'crypto';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BusinessAuthorizationContext } from '../../common/security/contracts.js';
import { AppError } from '../../common/errors/app-error.js';
import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import type { TransferEligibilityService } from './transfer-eligibility.service.js';
import type {
  InitiateTransferInput,
  RespondTransferInput,
  BusinessReviewTransferInput,
  UpdateBusinessTransferPolicyInput,
} from '@warrantypass/validation';

export class TransferService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly eligibilityService: TransferEligibilityService
  ) {}

  private generateTransferNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TRF-${timestamp}-${random}`;
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  public async initiateTransfer(userId: string, userEmail: string, input: InitiateTransferInput) {
    if (userEmail.toLowerCase() === input.recipientEmail.toLowerCase()) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Cannot transfer product ownership to your own account', statusCode: 400 });
    }

    const evalResult = await this.eligibilityService.evaluateEligibility(userId, input.customerProductId);
    if (!evalResult.isEligible) {
      throw new AppError({ code: 'BAD_REQUEST', message: `Transfer ineligible: ${evalResult.reasons.join(', ')}`, statusCode: 400 });
    }

    const { warranty } = evalResult;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const invitationTokenHash = this.hashToken(rawToken);
    const transferNumber = this.generateTransferNumber();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const recipientUser = await this.prisma.user.findUnique({
      where: { email: input.recipientEmail.toLowerCase() },
    });

    const initialStatus = 'PENDING_RECIPIENT';

    const transfer = await this.prisma.ownershipTransfer.create({
      data: {
        transferNumber,
        customerProductId: input.customerProductId,
        warrantyId: warranty.id,
        businessId: warranty.issuerBusinessId,
        senderUserId: userId,
        recipientEmail: input.recipientEmail.toLowerCase(),
        recipientUserId: recipientUser?.id ?? null,
        invitationTokenHash,
        status: initialStatus,
        expiresAt,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: initialStatus,
            changedByUserId: userId,
            note: input.note ?? 'Transfer invitation issued',
          },
        },
      },
      include: {
        customerProduct: true,
        warranty: true,
        business: true,
      },
    });

    return {
      transfer,
      rawToken,
    };
  }

  public async respondToTransfer(userId: string, userEmail: string, transferId: string, input: RespondTransferInput) {
    const transfer = await this.prisma.ownershipTransfer.findFirst({
      where: { id: transferId, recipientEmail: userEmail.toLowerCase() },
      include: { customerProduct: true, warranty: true },
    });

    if (!transfer) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Transfer request not found for your account', statusCode: 404 });
    }

    if (transfer.status !== 'PENDING_RECIPIENT') {
      throw new AppError({ code: 'BAD_REQUEST', message: `Transfer is in state ${transfer.status} and cannot be acted upon`, statusCode: 400 });
    }

    if (new Date() > transfer.expiresAt) {
      await this.prisma.ownershipTransfer.update({
        where: { id: transferId },
        data: { status: 'EXPIRED' },
      });
      throw new AppError({ code: 'BAD_REQUEST', message: 'Transfer invitation has expired', statusCode: 400 });
    }

    if (input.action === 'REJECT') {
      const updated = await this.prisma.ownershipTransfer.update({
        where: { id: transferId },
        data: {
          status: 'RECIPIENT_REJECTED',
          recipientUserId: userId,
          rejectionReason: input.rejectionReason ?? null,
          statusHistory: {
            create: {
              fromStatus: transfer.status,
              toStatus: 'RECIPIENT_REJECTED',
              changedByUserId: userId,
              note: input.rejectionReason ?? 'Recipient rejected transfer',
            },
          },
        },
      });
      return updated;
    }

    const policy = await this.prisma.businessTransferPolicy.findUnique({
      where: { businessId: transfer.businessId },
    });

    const requireApproval = policy ? policy.requireBusinessApproval : true;

    if (requireApproval) {
      const updated = await this.prisma.ownershipTransfer.update({
        where: { id: transferId },
        data: {
          status: 'PENDING_BUSINESS_APPROVAL',
          recipientUserId: userId,
          acceptedAt: new Date(),
          statusHistory: {
            create: {
              fromStatus: transfer.status,
              toStatus: 'PENDING_BUSINESS_APPROVAL',
              changedByUserId: userId,
              note: 'Recipient accepted transfer; pending business approval',
            },
          },
        },
      });
      return updated;
    }

    return await this.executeAtomicTransfer(transfer.id, userId, null);
  }

  public async businessReviewTransfer(
    auth: BusinessAuthorizationContext,
    transferId: string,
    input: BusinessReviewTransferInput
  ) {
    if (!auth.permissions.has(BUSINESS_PERMISSIONS.TRANSFERS_APPROVE) && !auth.isOwner) {
      throw new AppError({ code: 'BUSINESS_PERMISSION_DENIED', message: 'Permission denied', statusCode: 403 });
    }

    const transfer = await this.prisma.ownershipTransfer.findFirst({
      where: { id: transferId, businessId: auth.businessId },
    });

    if (!transfer) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Transfer request not found', statusCode: 404 });
    }

    if (transfer.status !== 'PENDING_BUSINESS_APPROVAL') {
      throw new AppError({ code: 'BAD_REQUEST', message: `Transfer is in state ${transfer.status} and cannot be reviewed by business`, statusCode: 400 });
    }

    if (input.action === 'REJECT') {
      const updated = await this.prisma.ownershipTransfer.update({
        where: { id: transferId },
        data: {
          status: 'REJECTED',
          businessApprovedBy: auth.membershipId,
          rejectionReason: input.rejectionReason ?? null,
          statusHistory: {
            create: {
              fromStatus: transfer.status,
              toStatus: 'REJECTED',
              changedByUserId: auth.userId,
              note: input.rejectionReason ?? 'Business rejected transfer',
            },
          },
        },
      });
      return updated;
    }

    return await this.executeAtomicTransfer(transfer.id, auth.userId, auth.membershipId);
  }

  private async executeAtomicTransfer(transferId: string, actorUserId: string, approvedByMemberId: string | null) {
    return await this.prisma.$transaction(async (tx: any) => {
      const transfer = await tx.ownershipTransfer.findUnique({
        where: { id: transferId },
        include: { customerProduct: true, warranty: true },
      });

      if (!transfer || !transfer.recipientUserId) {
        throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid transfer state for completion', statusCode: 400 });
      }

      const now = new Date();

      await tx.productOwnershipHistory.create({
        data: {
          customerProductId: transfer.customerProductId,
          previousOwnerId: transfer.senderUserId,
          newOwnerId: transfer.recipientUserId,
          transferId: transfer.id,
          transferredAt: now,
        },
      });

      await tx.customerProduct.update({
        where: { id: transfer.customerProductId },
        data: {
          customerUserId: transfer.recipientUserId,
          ownershipStatus: 'ACTIVE',
        },
      });

      await tx.warranty.update({
        where: { id: transfer.warrantyId },
        data: {
          customerUserId: transfer.recipientUserId,
        },
      });

      const completed = await tx.ownershipTransfer.update({
        where: { id: transferId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          businessApprovedAt: now,
          businessApprovedBy: approvedByMemberId,
          statusHistory: {
            create: {
              fromStatus: transfer.status,
              toStatus: 'COMPLETED',
              changedByUserId: actorUserId,
              note: 'Ownership transfer completed successfully',
            },
          },
        },
      });

      return completed;
    });
  }

  public async getBusinessTransferPolicy(auth: BusinessAuthorizationContext) {
    let policy = await this.prisma.businessTransferPolicy.findUnique({
      where: { businessId: auth.businessId },
    });

    if (!policy) {
      policy = await this.prisma.businessTransferPolicy.create({
        data: {
          businessId: auth.businessId,
          isTransferAllowed: true,
          requireBusinessApproval: true,
          maxTransfersPerWarranty: 3,
          minRemainingDaysRequired: 30,
          transferRepairHistoryAllowed: true,
        },
      });
    }

    return policy;
  }

  public async updateBusinessTransferPolicy(auth: BusinessAuthorizationContext, input: UpdateBusinessTransferPolicyInput) {
    const policy = await this.prisma.businessTransferPolicy.upsert({
      where: { businessId: auth.businessId },
      update: { ...input },
      create: { businessId: auth.businessId, ...input },
    });

    return policy;
  }

  public async listCustomerTransfers(userId: string, userEmail: string) {
    const sent = await this.prisma.ownershipTransfer.findMany({
      where: { senderUserId: userId },
      include: {
        customerProduct: { select: { productName: true, serialNumber: true } },
        business: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const received = await this.prisma.ownershipTransfer.findMany({
      where: { recipientEmail: userEmail.toLowerCase() },
      include: {
        customerProduct: { select: { productName: true, serialNumber: true } },
        business: { select: { name: true } },
        sender: { select: { id: true, email: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      sent,
      received: received.map((r: any) => ({
        ...r,
        sender: {
          name: r.sender?.profile?.fullName || r.sender?.email || 'Previous Owner',
        },
      })),
    };
  }

  public async listBusinessTransfers(auth: BusinessAuthorizationContext) {
    const transfers = await this.prisma.ownershipTransfer.findMany({
      where: { businessId: auth.businessId },
      include: {
        customerProduct: { select: { productName: true, serialNumber: true } },
        sender: { select: { id: true, email: true, profile: true } },
        recipient: { select: { id: true, email: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transfers.map((t: any) => ({
      ...t,
      senderName: t.sender?.profile?.fullName || t.sender?.email || 'N/A',
      recipientName: t.recipient?.profile?.fullName || t.recipient?.email || t.recipientEmail,
    }));
  }
}
