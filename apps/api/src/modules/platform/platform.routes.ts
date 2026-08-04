import { PLATFORM_PERMISSIONS } from '@warrantypass/shared';
import {
  approveBusinessSchema,
  nonEmptySearchSchema,
  paginationSchema,
  rejectBusinessSchema,
  requestMoreInformationSchema,
  reviewClaimSchema,
  suspendBusinessSchema,
  uuidSchema,
} from '@warrantypass/validation';
import { Router } from 'express';
import { z } from 'zod';

import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requirePlatformPermission } from '../../common/middleware/authorization.js';
import { requireAuthentication } from '../../common/middleware/authentication.js';
import { requireCsrf } from '../../common/middleware/csrf.js';
import { validateRequest } from '../../common/middleware/validate-request.js';
import type { RateLimitPolicies } from '../../common/security/rate-limit.js';
import type { TokenService } from '../../common/security/token.service.js';
import type { PlatformController } from './platform.controller.js';

export function createPlatformRouter(input: {
  controller: PlatformController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
  rateLimits: RateLimitPolicies;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const csrf = requireCsrf(input.config);
  const handle = input.controller.handleError;
  const businessParams = z.object({ businessId: uuidSchema });
  const documentParams = z.object({ businessId: uuidSchema, documentId: uuidSchema });

  router.get(
    '/platform/dashboard',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.DASHBOARD_VIEW),
    handle(input.controller.dashboard),
  );
  router.get(
    '/platform/businesses',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
    handle(input.controller.queue),
  );
  router.get(
    '/platform/businesses/:businessId',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_REVIEW),
    validateRequest('params', businessParams),
    handle(input.controller.application),
  );
  router.get(
    '/platform/businesses/:businessId/documents/:documentId',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_REVIEW),
    validateRequest('params', documentParams),
    handle(input.controller.document),
  );
  router.post(
    '/platform/businesses/:businessId/claim',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_REVIEW),
    csrf,
    input.rateLimits.adminReview,
    validateRequest('params', businessParams),
    validateRequest('body', reviewClaimSchema),
    handle(input.controller.claim),
  );
  router.post(
    '/platform/businesses/:businessId/approve',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_VERIFY),
    csrf,
    input.rateLimits.adminReview,
    validateRequest('params', businessParams),
    validateRequest('body', approveBusinessSchema),
    handle(input.controller.approve),
  );
  router.post(
    '/platform/businesses/:businessId/more-information',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_REVIEW),
    csrf,
    input.rateLimits.adminReview,
    validateRequest('params', businessParams),
    validateRequest('body', requestMoreInformationSchema),
    handle(input.controller.moreInformation),
  );
  router.post(
    '/platform/businesses/:businessId/reject',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_REJECT),
    csrf,
    input.rateLimits.adminReview,
    validateRequest('params', businessParams),
    validateRequest('body', rejectBusinessSchema),
    handle(input.controller.reject),
  );
  router.post(
    '/platform/businesses/:businessId/suspend',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_SUSPEND),
    csrf,
    input.rateLimits.adminReview,
    validateRequest('params', businessParams),
    validateRequest('body', suspendBusinessSchema),
    handle(input.controller.suspend),
  );
  router.post(
    '/platform/businesses/:businessId/restore',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_SUSPEND),
    csrf,
    input.rateLimits.adminReview,
    validateRequest('params', businessParams),
    validateRequest('body', reviewClaimSchema),
    handle(input.controller.restore),
  );
  router.get(
    '/platform/audit-logs',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW),
    validateRequest('query', paginationSchema),
    handle(input.controller.auditLogs),
  );
  router.get(
    '/platform/users',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.USERS_VIEW),
    validateRequest('query', z.object({ search: nonEmptySearchSchema })),
    handle(input.controller.users),
  );
  return router;
}
