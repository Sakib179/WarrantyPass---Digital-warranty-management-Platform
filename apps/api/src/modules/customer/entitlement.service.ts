import type { PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../../common/errors/app-error.js';

export const MANUAL_VAULT_PLAN_KEY = 'manual-vault-annual';

export async function hasManualVaultEntitlement(
  prisma: PrismaClient,
  userId: string,
  now = new Date(),
): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      ownerType: 'USER',
      planKey: MANUAL_VAULT_PLAN_KEY,
      status: { in: ['ACTIVE', 'TRIALING'] },
      currentPeriodStart: { lte: now },
      currentPeriodEnd: { gt: now },
    },
    select: { id: true },
  });
  return Boolean(subscription);
}

export async function requireManualVaultEntitlement(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  if (!(await hasManualVaultEntitlement(prisma, userId))) {
    throw new AppError({
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'An active Manual Warranty Vault Annual subscription is required.',
      statusCode: 402,
    });
  }
}
