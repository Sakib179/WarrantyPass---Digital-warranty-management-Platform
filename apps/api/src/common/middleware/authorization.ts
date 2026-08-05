import type { BusinessPermission, PlatformPermission } from '@warrantypass/shared';
import { DEFAULT_ROLE_KEYS } from '@warrantypass/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../errors/app-error.js';
import type { BusinessAuthorizationContext } from '../security/contracts.js';

export function requireBusinessMembership(prisma: PrismaClient): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth) throw authenticationRequired();
      const businessId = req.get('x-business-id');
      if (!businessId) {
        throw new AppError({
          code: 'BUSINESS_MEMBERSHIP_REQUIRED',
          message: 'Select a business workspace to continue.',
          statusCode: 403,
        });
      }
      const membership = await prisma.businessMember.findFirst({
        where: {
          businessId,
          userId: req.auth.userId,
          status: 'ACTIVE',
          deletedAt: null,
          business: { deletedAt: null },
        },
        include: {
          business: true,
          role: { include: { permissions: { include: { permission: true } } } },
          roles: {
            include: { role: { include: { permissions: { include: { permission: true } } } } },
          },
        },
      });
      if (!membership) {
        throw new AppError({
          code: 'BUSINESS_MEMBERSHIP_REQUIRED',
          message: 'You do not have access to this business workspace.',
          statusCode: 403,
        });
      }
      const roles =
        membership.roles.length > 0
          ? membership.roles.map((assignment) => assignment.role)
          : [membership.role];
      const permissions = new Set(
        roles.flatMap((role) =>
          role.permissions.map((assignment) => assignment.permission.key as BusinessPermission),
        ),
      );
      req.businessAuth = {
        userId: req.auth.userId,
        sessionId: req.auth.sessionId,
        businessId,
        membershipId: membership.id,
        permissions,
        isOwner: roles.some((role) => role.key === DEFAULT_ROLE_KEYS.BUSINESS_OWNER),
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function extractBusinessAuth(req: Request): BusinessAuthorizationContext {
  if (!req.businessAuth) {
    throw new AppError({
      code: 'BUSINESS_MEMBERSHIP_REQUIRED',
      message: 'Workspace context is required.',
      statusCode: 403,
    });
  }
  return req.businessAuth;
}

export function requireBusinessPermission(permission: BusinessPermission): RequestHandler {
  return (req, _res, next): void => {
    if (!req.businessAuth?.permissions.has(permission)) {
      next(
        new AppError({
          code: 'BUSINESS_PERMISSION_DENIED',
          message: 'You do not have permission to perform this business action.',
          statusCode: 403,
        }),
      );
      return;
    }
    next();
  };
}

export function requireVerifiedBusiness(prisma: PrismaClient): RequestHandler {
  return async (req, _res, next): Promise<void> => {
    try {
      if (!req.businessAuth) throw authenticationRequired();
      const business = await prisma.business.findUnique({
        where: { id: req.businessAuth.businessId },
        select: { status: true },
      });
      if (business?.status !== 'VERIFIED') {
        throw new AppError({
          code: 'BUSINESS_NOT_VERIFIED',
          message: 'This action is available only to verified businesses.',
          statusCode: 403,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireBusinessOwner(): RequestHandler {
  return (req, _res, next): void => {
    if (!req.businessAuth?.isOwner) {
      next(
        new AppError({
          code: 'BUSINESS_PERMISSION_DENIED',
          message: 'Business owner authority is required.',
          statusCode: 403,
        }),
      );
      return;
    }
    next();
  };
}

export function requirePlatformPermission(
  prisma: PrismaClient,
  permission: PlatformPermission,
): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth) throw authenticationRequired();
      const assignments = await prisma.userPlatformRole.findMany({
        where: { userId: req.auth.userId, status: 'ACTIVE' },
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      });
      const permissions = new Set(
        assignments.flatMap((assignment) =>
          assignment.role.permissions.map(
            (rolePermission) => rolePermission.permission.key as PlatformPermission,
          ),
        ),
      );
      if (!permissions.has(permission)) {
        throw new AppError({
          code: 'PLATFORM_PERMISSION_DENIED',
          message: 'You do not have permission to access this platform function.',
          statusCode: 403,
        });
      }
      req.platformAuth = {
        userId: req.auth.userId,
        sessionId: req.auth.sessionId,
        permissions,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

function authenticationRequired(): AppError {
  return new AppError({
    code: 'AUTH_TOKEN_INVALID',
    message: 'Authentication is required.',
    statusCode: 401,
  });
}
