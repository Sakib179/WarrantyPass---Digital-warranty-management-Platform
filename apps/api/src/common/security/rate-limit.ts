import { createHash } from 'node:crypto';

import { type Request, type RequestHandler } from 'express';
import rateLimit, { ipKeyGenerator, type Store } from 'express-rate-limit';

import type { AppConfig } from '../../config/env.js';

export type RateLimitStoreFactory = (namespace: string) => Store | undefined;

export interface RateLimitPolicies {
  registration: RequestHandler;
  login: RequestHandler;
  verificationResend: RequestHandler;
  passwordRecovery: RequestHandler;
  passwordReset: RequestHandler;
  refresh: RequestHandler;
  invitation: RequestHandler;
  invitationAcceptance: RequestHandler;
  upload: RequestHandler;
  adminReview: RequestHandler;
}

export function createRateLimitPolicies(
  config: AppConfig,
  storeFactory?: RateLimitStoreFactory,
): RateLimitPolicies {
  const policy = (
    namespace: string,
    windowMs: number,
    limit: number,
    keyGenerator?: (request: Request) => string,
  ): RequestHandler => {
    const store = storeFactory?.(namespace);
    return rateLimit({
      windowMs,
      limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      ...(store ? { store } : {}),
      ...(keyGenerator ? { keyGenerator } : {}),
      handler: (_req, res) => {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please wait before trying again.',
            details: [],
          },
        });
      },
    });
  };

  const accountKey = (request: Request): string => {
    const body = request.body as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const emailDigest = createHash('sha256').update(email).digest('hex').slice(0, 24);
    return `${ipKeyGenerator(request.ip ?? 'unknown')}:${emailDigest}`;
  };

  return {
    registration: policy('registration', 60 * 60_000, 5, accountKey),
    login: policy('login', 15 * 60_000, 10, accountKey),
    verificationResend: policy('verification-resend', 60 * 60_000, 5, accountKey),
    passwordRecovery: policy('password-recovery', 60 * 60_000, 5, accountKey),
    passwordReset: policy('password-reset', 60 * 60_000, 10),
    refresh: policy('refresh', 60_000, 60),
    invitation: policy('invitation', 60 * 60_000, 30),
    invitationAcceptance: policy('invitation-acceptance', 60 * 60_000, 20),
    upload: policy('verification-upload', 60 * 60_000, 20),
    adminReview: policy('admin-review', 60_000, 60),
  };
}
