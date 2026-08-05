import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import {
  createWarrantyTemplateSchema,
  updateWarrantyTemplateSchema,
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
import type { WarrantyTemplateController } from './warranty-template.controller.js';

export function createWarrantyTemplateRouter(input: {
  controller: WarrantyTemplateController;
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
    '/business/warranty-templates',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.WARRANTY_TEMPLATES_VIEW),
    handle(input.controller.listTemplates),
  );

  router.post(
    '/business/warranty-templates',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.WARRANTY_TEMPLATES_MANAGE),
    csrf,
    validateRequest('body', createWarrantyTemplateSchema),
    handle(input.controller.createTemplate),
  );

  router.get(
    '/business/warranty-templates/:templateId',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.WARRANTY_TEMPLATES_VIEW),
    validateRequest('params', z.object({ templateId: uuidSchema })),
    handle(input.controller.getTemplate),
  );

  router.patch(
    '/business/warranty-templates/:templateId',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.WARRANTY_TEMPLATES_MANAGE),
    csrf,
    validateRequest('params', z.object({ templateId: uuidSchema })),
    validateRequest('body', updateWarrantyTemplateSchema),
    handle(input.controller.updateTemplate),
  );

  return router;
}
