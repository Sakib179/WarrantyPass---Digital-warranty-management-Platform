import { Router } from 'express';

import type { AppConfig } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { AuditWriter } from '../common/security/contracts.js';
import { Argon2PasswordHasher } from '../common/security/password.js';
import {
  createRateLimitPolicies,
  type RateLimitStoreFactory,
} from '../common/security/rate-limit.js';
import { TokenService } from '../common/security/token.service.js';
import type { EmailProvider } from '../infrastructure/email/email-provider.js';
import type { StorageProvider } from '../infrastructure/storage/storage-provider.js';
import { AuthController } from './auth/auth.controller.js';
import { createAuthRouter } from './auth/auth.routes.js';
import { AuthService } from './auth/auth.service.js';
import { BusinessApplicationService } from './businesses/business-application.service.js';
import { BusinessController } from './businesses/business.controller.js';
import { createBusinessRouter } from './businesses/business.routes.js';
import { MembershipService } from './businesses/membership.service.js';
import { PlatformController } from './platform/platform.controller.js';
import { createPlatformRouter } from './platform/platform.routes.js';
import { PlatformService } from './platform/platform.service.js';

export function createV1FeatureRouter(input: {
  config: AppConfig;
  prisma: PrismaClient;
  email: EmailProvider;
  storage: StorageProvider;
  audit: AuditWriter;
  rateLimitStoreFactory?: RateLimitStoreFactory;
}): Router {
  const router = Router();
  const tokens = new TokenService(input.config);
  const passwords = new Argon2PasswordHasher(input.config);
  const rateLimits = createRateLimitPolicies(input.config, input.rateLimitStoreFactory);
  const authService = new AuthService(
    input.prisma,
    input.config,
    tokens,
    passwords,
    input.email,
    input.audit,
  );
  const applicationService = new BusinessApplicationService(
    input.prisma,
    input.config,
    tokens,
    passwords,
    input.email,
    input.storage,
    input.audit,
  );
  const membershipService = new MembershipService(
    input.prisma,
    input.config,
    tokens,
    input.email,
    input.audit,
  );
  const platformService = new PlatformService(input.prisma, input.config, input.email, input.audit);
  const authController = new AuthController(authService, input.config);
  const businessController = new BusinessController(applicationService, membershipService);
  const platformController = new PlatformController(platformService, applicationService);

  router.use(
    createAuthRouter({
      controller: authController,
      config: input.config,
      prisma: input.prisma,
      tokens,
      rateLimits,
    }),
  );
  router.use(
    createBusinessRouter({
      controller: businessController,
      config: input.config,
      prisma: input.prisma,
      tokens,
      rateLimits,
    }),
  );
  router.use(
    createPlatformRouter({
      controller: platformController,
      config: input.config,
      prisma: input.prisma,
      tokens,
      rateLimits,
    }),
  );
  return router;
}
