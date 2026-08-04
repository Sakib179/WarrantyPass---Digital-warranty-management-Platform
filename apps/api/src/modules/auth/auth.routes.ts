import {
  changePasswordSchema,
  customerRegistrationSchema,
  deactivateAccountSchema,
  emailResendSchema,
  emailTokenSchema,
  forgotPasswordSchema,
  loginSchema,
  requestEmailChangeSchema,
  resetPasswordSchema,
  updateProfileSchema,
  uuidSchema,
} from '@warrantypass/validation';
import { Router } from 'express';
import { z } from 'zod';

import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireAuthentication } from '../../common/middleware/authentication.js';
import { requireCsrf } from '../../common/middleware/csrf.js';
import { validateRequest } from '../../common/middleware/validate-request.js';
import type { TokenService } from '../../common/security/token.service.js';
import type { RateLimitPolicies } from '../../common/security/rate-limit.js';
import type { AuthController } from './auth.controller.js';

export function createAuthRouter(input: {
  controller: AuthController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
  rateLimits: RateLimitPolicies;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const csrf = requireCsrf(input.config);
  const handle = input.controller.handleError;

  router.post(
    '/auth/register',
    input.rateLimits.registration,
    validateRequest('body', customerRegistrationSchema),
    handle(input.controller.register),
  );
  router.post(
    '/auth/email/verify',
    validateRequest('body', emailTokenSchema),
    handle(input.controller.verifyEmail),
  );
  router.post(
    '/auth/email/resend',
    input.rateLimits.verificationResend,
    validateRequest('body', emailResendSchema),
    handle(input.controller.resendVerification),
  );
  router.post(
    '/auth/login',
    input.rateLimits.login,
    validateRequest('body', loginSchema),
    handle(input.controller.login),
  );
  router.post('/auth/refresh', input.rateLimits.refresh, csrf, handle(input.controller.refresh));
  router.post('/auth/logout', csrf, handle(input.controller.logout));
  router.post('/auth/logout-all', auth, csrf, handle(input.controller.logoutAll));
  router.get('/auth/me', auth, handle(input.controller.me));
  router.post(
    '/auth/password/forgot',
    input.rateLimits.passwordRecovery,
    validateRequest('body', forgotPasswordSchema),
    handle(input.controller.forgotPassword),
  );
  router.post(
    '/auth/password/reset',
    input.rateLimits.passwordReset,
    validateRequest('body', resetPasswordSchema),
    handle(input.controller.resetPassword),
  );
  router.post(
    '/auth/password/change',
    auth,
    csrf,
    validateRequest('body', changePasswordSchema),
    handle(input.controller.changePassword),
  );
  router.get('/auth/sessions', auth, handle(input.controller.sessions));
  router.delete(
    '/auth/sessions/:sessionId',
    auth,
    csrf,
    validateRequest('params', z.object({ sessionId: uuidSchema })),
    handle(input.controller.revokeSession),
  );

  router.patch(
    '/account/profile',
    auth,
    csrf,
    validateRequest('body', updateProfileSchema),
    handle(input.controller.updateProfile),
  );
  router.post(
    '/account/email/change',
    auth,
    csrf,
    validateRequest('body', requestEmailChangeSchema),
    handle(input.controller.requestEmailChange),
  );
  router.post(
    '/account/email/verify',
    validateRequest('body', emailTokenSchema),
    handle(input.controller.confirmEmailChange),
  );
  router.post(
    '/account/deactivate',
    auth,
    csrf,
    validateRequest('body', deactivateAccountSchema),
    handle(input.controller.deactivate),
  );
  return router;
}
