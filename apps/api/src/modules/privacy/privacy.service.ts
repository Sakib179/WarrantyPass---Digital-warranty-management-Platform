import type { PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../../common/errors/app-error.js';
import type { CreatePrivacyRequestInput } from '@warrantypass/validation';

export class PrivacyService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createPrivacyRequest(userId: string, input: CreatePrivacyRequestInput) {
    const existing = await this.prisma.privacyRequest.findFirst({
      where: {
        userId,
        requestType: input.requestType,
        status: { in: ['REQUESTED', 'UNDER_REVIEW', 'SCHEDULED'] },
      },
    });

    if (existing) {
      throw new AppError({
        code: 'CONFLICT',
        message: `An active ${input.requestType} privacy request is already pending.`,
        statusCode: 409,
      });
    }

    const request = await this.prisma.privacyRequest.create({
      data: {
        userId,
        requestType: input.requestType,
        status: 'REQUESTED',
      },
    });

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: `privacy.request.${input.requestType.toLowerCase()}`,
        resourceType: 'PrivacyRequest',
        resourceId: request.id,
        metadata: { reason: input.reason ?? null },
      },
    });

    return request;
  }

  public async listUserPrivacyRequests(userId: string) {
    return await this.prisma.privacyRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  public async exportUserDataPayload(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        kind: true,
        createdAt: true,
        profile: true,
      },
    });

    const [products, warranties, claims, transfers, reviews] = await Promise.all([
      this.prisma.customerProduct.findMany({
        where: { customerUserId: userId },
      }),
      this.prisma.warranty.findMany({
        where: { customerUserId: userId },
      }),
      this.prisma.warrantyClaim.findMany({
        where: { submittedByUserId: userId },
      }),
      this.prisma.ownershipTransfer.findMany({
        where: { OR: [{ senderUserId: userId }, { recipientEmail: user?.email ?? '' }] },
      }),
      this.prisma.recallAcknowledgement.findMany({
        where: { customerUserId: userId },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      account: user,
      registeredProducts: products,
      warranties,
      claimsSubmitted: claims,
      ownershipTransfers: transfers,
      recallAcknowledgements: reviews,
    };
  }
}
