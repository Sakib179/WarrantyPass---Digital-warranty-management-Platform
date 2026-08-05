import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import {
  assignClaimSchema,
  cancelClaimSchema,
  postClaimMessageSchema,
  submitClaimSchema,
  updateClaimStatusSchema,
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
import type { ClaimController } from './claim.controller.js';

export function createClaimRouter(input: {
  controller: ClaimController;
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

  // --------------------------------------------------
  // CUSTOMER CLAIMS ENDPOINTS
  // --------------------------------------------------

  router.get('/customer/claims', auth, verifiedEmail, handle(input.controller.listCustomerClaims));

  router.post(
    '/customer/claims',
    auth,
    verifiedEmail,
    csrf,
    validateRequest('body', submitClaimSchema),
    handle(input.controller.submitClaim),
  );

  router.get(
    '/customer/claims/:claimId',
    auth,
    verifiedEmail,
    validateRequest('params', z.object({ claimId: uuidSchema })),
    handle(input.controller.getCustomerClaim),
  );

  router.post(
    '/customer/claims/:claimId/cancel',
    auth,
    verifiedEmail,
    csrf,
    validateRequest('params', z.object({ claimId: uuidSchema })),
    validateRequest('body', cancelClaimSchema),
    handle(input.controller.cancelCustomerClaim),
  );

  router.post(
    '/customer/claims/:claimId/messages',
    auth,
    verifiedEmail,
    csrf,
    validateRequest('params', z.object({ claimId: uuidSchema })),
    validateRequest('body', postClaimMessageSchema),
    handle(input.controller.postCustomerMessage),
  );

  // --------------------------------------------------
  // BUSINESS CLAIMS ENDPOINTS
  // --------------------------------------------------

  router.get(
    '/business/claims',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.CLAIMS_VIEW),
    handle(input.controller.listBusinessClaims),
  );

  router.get(
    '/business/claims/:claimId',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.CLAIMS_VIEW),
    validateRequest('params', z.object({ claimId: uuidSchema })),
    handle(input.controller.getBusinessClaim),
  );

  router.post(
    '/business/claims/:claimId/status',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.CLAIMS_UPDATE_STATUS),
    csrf,
    validateRequest('params', z.object({ claimId: uuidSchema })),
    validateRequest('body', updateClaimStatusSchema),
    handle(input.controller.updateClaimStatus),
  );

  router.post(
    '/business/claims/:claimId/assign',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.CLAIMS_ASSIGN),
    csrf,
    validateRequest('params', z.object({ claimId: uuidSchema })),
    validateRequest('body', assignClaimSchema),
    handle(input.controller.assignClaim),
  );

  router.post(
    '/business/claims/:claimId/messages',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.CLAIMS_MESSAGE),
    csrf,
    validateRequest('params', z.object({ claimId: uuidSchema })),
    validateRequest('body', postClaimMessageSchema),
    handle(input.controller.postBusinessMessage),
  );

  return router;
}
