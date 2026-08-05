import { Router } from 'express';
import type { ServiceCenterController } from './service-center.controller.js';
import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { TokenService } from '../../common/security/token.service.js';
import { requireAuthentication } from '../../common/middleware/authentication.js';
import { requireBusinessMembership } from '../../common/middleware/authorization.js';

export function createServiceCenterRouter(input: {
  controller: ServiceCenterController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const business = requireBusinessMembership(input.prisma);
  const handle = input.controller.handleError;

  // Customer finder (authenticated customer)
  router.get(
    '/customer/service-centers',
    auth,
    handle(input.controller.searchCustomerServiceCenters)
  );

  // Business management
  router.get(
    '/business/service-centers',
    auth,
    business,
    handle(input.controller.listBusinessServiceCenters)
  );

  router.post(
    '/business/service-centers',
    auth,
    business,
    handle(input.controller.createServiceCenter)
  );

  router.get(
    '/business/service-centers/:serviceCenterId',
    auth,
    business,
    handle(input.controller.getServiceCenter)
  );

  router.patch(
    '/business/service-centers/:serviceCenterId',
    auth,
    business,
    handle(input.controller.updateServiceCenter)
  );

  router.post(
    '/business/claims/:claimId/service-center',
    auth,
    business,
    handle(input.controller.assignClaimServiceCenter)
  );

  return router;
}
