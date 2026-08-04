import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../errors/app-error.js';
import type { TokenService } from '../security/token.service.js';

export function requireAuthentication(prisma: PrismaClient, tokens: TokenService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authorization = req.get('authorization');
      if (!authorization?.startsWith('Bearer ')) {
        throw unauthorized('AUTH_TOKEN_INVALID', 'Authentication is required.');
      }
      const claims = await tokens.verifyAccessToken(authorization.slice(7));
      const session = await prisma.session.findFirst({
        where: {
          id: claims.sessionId,
          userId: claims.subject,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { deletedAt: null },
        },
        include: { user: true },
      });
      if (!session) {
        throw unauthorized('AUTH_SESSION_EXPIRED', 'The session is no longer active.');
      }
      if (session.user.status === 'SUSPENDED' || session.user.status === 'DEACTIVATED') {
        throw new AppError({
          code: 'AUTH_ACCOUNT_SUSPENDED',
          message: 'This account is not currently available.',
          statusCode: 403,
        });
      }
      req.auth = {
        userId: session.userId,
        sessionId: session.id,
        kind: session.user.kind,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireVerifiedEmail(prisma: PrismaClient): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth) throw unauthorized('AUTH_TOKEN_INVALID', 'Authentication is required.');
      const user = await prisma.user.findUnique({
        where: { id: req.auth.userId },
        select: { emailVerifiedAt: true },
      });
      if (!user?.emailVerifiedAt) {
        throw new AppError({
          code: 'EMAIL_VERIFICATION_REQUIRED',
          message: 'Verify your email to continue.',
          statusCode: 403,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

function unauthorized(code: string, message: string): AppError {
  return new AppError({ code, message, statusCode: 401 });
}
