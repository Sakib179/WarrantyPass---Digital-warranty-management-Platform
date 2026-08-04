import type { RequestHandler } from 'express';

import type { AppConfig } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';

export function requireCsrf(config: AppConfig): RequestHandler {
  return (req, _res, next): void => {
    const cookieToken = (req.cookies as Record<string, unknown> | undefined)?.[
      config.AUTH_CSRF_COOKIE_NAME
    ];
    const headerToken = req.get('x-csrf-token');
    if (
      typeof cookieToken !== 'string' ||
      !headerToken ||
      cookieToken.length < 32 ||
      cookieToken !== headerToken
    ) {
      next(
        new AppError({
          code: 'CSRF_TOKEN_INVALID',
          message: 'The security token is missing or invalid. Refresh the page and try again.',
          statusCode: 403,
        }),
      );
      return;
    }
    next();
  };
}
