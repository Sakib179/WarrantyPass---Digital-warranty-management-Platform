import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import {
  correctWarrantySchema,
  issueWarrantySchema,
  revokeWarrantySchema,
  uuidSchema,
} from '@warrantypass/validation';
import { Router } from 'express';
import { z } from 'zod';

import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { TokenService } from '../../common/security/token.service.js';
import {
  requireBusinessMembership,
  requireBusinessPermission,
  requireVerifiedBusiness,
} from '../../common/middleware/authorization.js';
import {
  requireAuthentication,
  requireVerifiedEmail,
} from '../../common/middleware/authentication.js';
import { requireCsrf } from '../../common/middleware/csrf.js';
import { validateRequest } from '../../common/middleware/validate-request.js';
import type { BusinessWarrantyController } from './business-warranty.controller.js';

export function createBusinessWarrantyRouter(input: {
  controller: BusinessWarrantyController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const verifiedEmail = requireVerifiedEmail(input.prisma);
  const business = requireBusinessMembership(input.prisma);
  const verifiedBusiness = requireVerifiedBusiness(input.prisma);
  const csrf = requireCsrf(input.config);
  const handle = input.controller.handleError;

  router.get(
    '/business/warranties',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.WARRANTIES_VIEW),
    handle(input.controller.listWarranties),
  );

  router.post(
    '/business/warranties',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.WARRANTIES_ISSUE),
    csrf,
    validateRequest('body', issueWarrantySchema),
    handle(input.controller.issueWarranty),
  );

  router.get(
    '/business/warranties/:warrantyId',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.WARRANTIES_VIEW),
    validateRequest('params', z.object({ warrantyId: uuidSchema })),
    handle(input.controller.getWarranty),
  );

  router.post(
    '/business/warranties/:warrantyId/corrections',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.WARRANTIES_CORRECT),
    csrf,
    validateRequest('params', z.object({ warrantyId: uuidSchema })),
    validateRequest('body', correctWarrantySchema),
    handle(input.controller.correctWarranty),
  );

  router.post(
    '/business/warranties/:warrantyId/revoke',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.WARRANTIES_REVOKE),
    csrf,
    validateRequest('params', z.object({ warrantyId: uuidSchema })),
    validateRequest('body', revokeWarrantySchema),
    handle(input.controller.revokeWarranty),
  );

  return router;
}
