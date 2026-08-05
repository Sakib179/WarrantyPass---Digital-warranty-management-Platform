import { Router } from 'express';
import type { TransferController } from './transfer.controller.js';
import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { TokenService } from '../../common/security/token.service.js';
import { requireAuthentication } from '../../common/middleware/authentication.js';
import { requireBusinessMembership } from '../../common/middleware/authorization.js';

export function createTransferRouter(input: {
  controller: TransferController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const business = requireBusinessMembership(input.prisma);
  const handle = input.controller.handleError;

  // Customer routes
  router.get(
    '/customer/transfers/eligibility/:productId',
    auth,
    handle(input.controller.checkEligibility)
  );

  router.get(
    '/customer/transfers',
    auth,
    handle(input.controller.listCustomerTransfers)
  );

  router.post(
    '/customer/transfers',
    auth,
    handle(input.controller.initiateTransfer)
  );

  router.post(
    '/customer/transfers/:transferId/respond',
    auth,
    handle(input.controller.respondToTransfer)
  );

  // Business routes
  router.get(
    '/business/transfers',
    auth,
    business,
    handle(input.controller.listBusinessTransfers)
  );

  router.post(
    '/business/transfers/:transferId/review',
    auth,
    business,
    handle(input.controller.reviewBusinessTransfer)
  );

  router.get(
    '/business/transfers/policy',
    auth,
    business,
    handle(input.controller.getBusinessTransferPolicy)
  );

  router.put(
    '/business/transfers/policy',
    auth,
    business,
    handle(input.controller.updateBusinessTransferPolicy)
  );

  return router;
}
