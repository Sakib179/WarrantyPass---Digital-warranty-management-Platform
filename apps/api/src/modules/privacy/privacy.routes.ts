import { Router } from 'express';
import type { PrivacyController } from './privacy.controller.js';
import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { TokenService } from '../../common/security/token.service.js';
import { requireAuthentication } from '../../common/middleware/authentication.js';

export function createPrivacyRouter(input: {
  controller: PrivacyController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const handle = input.controller.handleError;

  router.get('/customer/privacy/export', auth, handle(input.controller.exportUserData));
  router.get('/customer/privacy/requests', auth, handle(input.controller.listPrivacyRequests));
  router.post('/customer/privacy/requests', auth, handle(input.controller.createPrivacyRequest));

  return router;
}
