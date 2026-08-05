import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import { createProductSchema, updateProductSchema, uuidSchema } from '@warrantypass/validation';
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
import type { ProductController } from './product.controller.js';

export function createProductRouter(input: {
  controller: ProductController;
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

  // Global brands & categories for selection
  router.get('/products/categories', auth, async (_req, res) => {
    const categories = await input.prisma.productCategory.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories, meta: {} });
  });

  router.get('/products/brands', auth, async (_req, res) => {
    const brands = await input.prisma.productBrand.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: brands, meta: {} });
  });

  // Business product routes
  router.get(
    '/business/products',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.PRODUCTS_VIEW),
    handle(input.controller.listProducts),
  );

  router.post(
    '/business/products',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.PRODUCTS_CREATE),
    csrf,
    validateRequest('body', createProductSchema),
    handle(input.controller.createProduct),
  );

  router.get(
    '/business/products/:productId',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.PRODUCTS_VIEW),
    validateRequest('params', z.object({ productId: uuidSchema })),
    handle(input.controller.getProduct),
  );

  router.patch(
    '/business/products/:productId',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.PRODUCTS_UPDATE),
    csrf,
    validateRequest('params', z.object({ productId: uuidSchema })),
    validateRequest('body', updateProductSchema),
    handle(input.controller.updateProduct),
  );

  router.delete(
    '/business/products/:productId',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.PRODUCTS_ARCHIVE),
    csrf,
    validateRequest('params', z.object({ productId: uuidSchema })),
    handle(input.controller.archiveProduct),
  );

  return router;
}
