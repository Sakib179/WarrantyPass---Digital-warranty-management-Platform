import { Router } from 'express';
import type { RecallController } from './recall.controller.js';
import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { TokenService } from '../../common/security/token.service.js';
import { requireAuthentication } from '../../common/middleware/authentication.js';
import { requireBusinessMembership } from '../../common/middleware/authorization.js';

export function createRecallRouter(input: {
  controller: RecallController;
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
    '/customer/recalls',
    auth,
    handle(input.controller.listCustomerRecalls)
  );

  router.get(
    '/customer/recalls/:recallId',
    auth,
    handle(input.controller.getCustomerRecall)
  );

  router.post(
    '/customer/recalls/:recallId/acknowledge',
    auth,
    handle(input.controller.acknowledgeRecall)
  );

  // Business routes
  router.get(
    '/business/recalls',
    auth,
    business,
    handle(input.controller.listBusinessRecalls)
  );

  router.post(
    '/business/recalls',
    auth,
    business,
    handle(input.controller.createRecallNotice)
  );

  router.post(
    '/business/recalls/:recallId/publish',
    auth,
    business,
    handle(input.controller.publishRecallNotice)
  );

  return router;
}
