import {
  billingWebhookSchema,
  catalogQuerySchema,
  customerListQuerySchema,
  documentKindSchema,
  extractionConfirmSchema,
  manualProductCreateSchema,
  manualProductUpdateSchema,
  subscriptionCheckoutSchema,
  uuidSchema,
} from '@warrantypass/validation';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import {
  requireAuthentication,
  requireVerifiedEmail,
} from '../../common/middleware/authentication.js';
import { requireCsrf } from '../../common/middleware/csrf.js';
import { validateRequest } from '../../common/middleware/validate-request.js';
import type { RateLimitPolicies } from '../../common/security/rate-limit.js';
import type { TokenService } from '../../common/security/token.service.js';
import type { CustomerController } from './customer.controller.js';

const idParams = z.object({ id: uuidSchema });

export function createCustomerRouter(input: {
  controller: CustomerController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
  rateLimits: RateLimitPolicies;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const verified = requireVerifiedEmail(input.prisma);
  const csrf = requireCsrf(input.config);
  const handle = input.controller.handle;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: input.config.WARRANTY_DOCUMENT_MAX_BYTES },
  });
  const secured = [auth, verified] as const;

  router.get('/customer/dashboard', ...secured, handle(input.controller.dashboard));
  router.get(
    '/customer/products',
    ...secured,
    validateRequest('query', customerListQuerySchema),
    handle(input.controller.products),
  );
  router.get(
    '/customer/products/:id',
    ...secured,
    validateRequest('params', idParams),
    handle(input.controller.product),
  );
  router.get(
    '/customer/warranties',
    ...secured,
    validateRequest('query', customerListQuerySchema),
    handle(input.controller.warranties),
  );
  router.get(
    '/customer/warranties/:id',
    ...secured,
    validateRequest('params', idParams),
    handle(input.controller.warranty),
  );
  router.post(
    '/customer/manual-products',
    ...secured,
    csrf,
    validateRequest('body', manualProductCreateSchema),
    handle(input.controller.createManual),
  );
  router.patch(
    '/customer/manual-products/:id',
    ...secured,
    csrf,
    validateRequest('params', idParams),
    validateRequest('body', manualProductUpdateSchema),
    handle(input.controller.updateManual),
  );
  router.delete(
    '/customer/manual-products/:id',
    ...secured,
    csrf,
    validateRequest('params', idParams),
    handle(input.controller.archiveManual),
  );
  router.post(
    '/customer/manual-products/:id/documents',
    ...secured,
    csrf,
    input.rateLimits.upload,
    validateRequest('params', idParams),
    upload.single('document'),
    validateRequest('body', documentKindSchema),
    handle(input.controller.uploadDocument),
  );
  router.delete(
    '/customer/warranty-documents/:id',
    ...secured,
    csrf,
    validateRequest('params', idParams),
    handle(input.controller.removeDocument),
  );
  router.get(
    '/customer/warranty-documents/:id/access',
    ...secured,
    validateRequest('params', idParams),
    handle(input.controller.accessDocument),
  );
  router.post(
    '/customer/document-extraction',
    ...secured,
    csrf,
    input.rateLimits.upload,
    upload.single('document'),
    handle(input.controller.extract),
  );
  router.post(
    '/customer/document-extraction/:id/confirm',
    ...secured,
    csrf,
    validateRequest('params', idParams),
    validateRequest('body', extractionConfirmSchema),
    handle(input.controller.confirmExtraction),
  );
  router.get('/customer/subscription', ...secured, handle(input.controller.subscription));
  router.post(
    '/customer/subscription/checkout',
    ...secured,
    csrf,
    validateRequest('body', subscriptionCheckoutSchema),
    handle(input.controller.checkout),
  );
  router.post('/customer/subscription/cancel', ...secured, csrf, handle(input.controller.cancel));
  router.get('/customer/payments', ...secured, handle(input.controller.payments));
  router.post(
    '/billing/webhooks/:provider',
    validateRequest('params', z.object({ provider: z.enum(['mock']) })),
    validateRequest('body', billingWebhookSchema),
    handle(input.controller.webhook),
  );
  router.get(
    '/catalog/brands',
    validateRequest('query', catalogQuerySchema),
    handle(input.controller.brands),
  );
  router.get(
    '/catalog/categories',
    validateRequest('query', catalogQuerySchema),
    handle(input.controller.categories),
  );
  return router;
}
