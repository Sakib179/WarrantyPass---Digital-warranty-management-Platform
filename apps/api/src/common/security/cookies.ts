import type { CookieOptions } from 'express';

import type { AppConfig } from '../../config/env.js';

export function refreshCookieOptions(config: AppConfig, maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: config.AUTH_COOKIE_SECURE,
    sameSite: config.AUTH_COOKIE_SAME_SITE,
    path: '/api/v1/auth',
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
    ...(config.AUTH_COOKIE_DOMAIN ? { domain: config.AUTH_COOKIE_DOMAIN } : {}),
  };
}

export function csrfCookieOptions(config: AppConfig, maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: false,
    secure: config.AUTH_COOKIE_SECURE,
    sameSite: config.AUTH_COOKIE_SAME_SITE,
    path: '/',
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
    ...(config.AUTH_COOKIE_DOMAIN ? { domain: config.AUTH_COOKIE_DOMAIN } : {}),
  };
}
