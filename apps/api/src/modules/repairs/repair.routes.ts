import { Router } from 'express';
import type { RepairController } from './repair.controller.js';
import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { TokenService } from '../../common/security/token.service.js';
import { requireAuthentication } from '../../common/middleware/authentication.js';
import { requireBusinessMembership } from '../../common/middleware/authorization.js';

export function createRepairRouter(input: {
  controller: RepairController;
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
    '/customer/repairs',
    auth,
    handle(input.controller.listCustomerRepairs)
  );

  router.get(
    '/customer/repairs/:repairId',
    auth,
    handle(input.controller.getCustomerRepair)
  );

  // Business routes
  router.get(
    '/business/repairs',
    auth,
    business,
    handle(input.controller.listBusinessRepairs)
  );

  router.post(
    '/business/repairs',
    auth,
    business,
    handle(input.controller.createRepair)
  );

  router.get(
    '/business/repairs/:repairId',
    auth,
    business,
    handle(input.controller.getBusinessRepair)
  );

  router.patch(
    '/business/repairs/:repairId',
    auth,
    business,
    handle(input.controller.updateRepairDetails)
  );

  router.post(
    '/business/repairs/:repairId/status',
    auth,
    business,
    handle(input.controller.updateRepairStatus)
  );

  return router;
}
