import { Router } from 'express';
import type { AdminController } from './admin.controller.js';
import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { TokenService } from '../../common/security/token.service.js';
import { requireAuthentication } from '../../common/middleware/authentication.js';
import { requirePlatformPermission } from '../../common/middleware/authorization.js';
import { PLATFORM_PERMISSIONS } from '@warrantypass/shared';

export function createAdminRouter(input: {
  controller: AdminController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const handle = input.controller.handleError;

  // Overview Dashboard
  router.get(
    '/admin/overview',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.DASHBOARD_VIEW),
    handle(input.controller.getOverview)
  );

  // User Management
  router.get(
    '/admin/users',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.USERS_VIEW),
    handle(input.controller.searchUsers)
  );

  router.post(
    '/admin/users/:userId/action',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.ADMINS_MANAGE),
    handle(input.controller.performUserAction)
  );

  // Business Management
  router.get(
    '/admin/businesses',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
    handle(input.controller.searchBusinesses)
  );

  router.post(
    '/admin/businesses/:businessId/action',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.BUSINESSES_SUSPEND),
    handle(input.controller.performBusinessAction)
  );

  // Subscriptions Management
  router.get(
    '/admin/subscriptions',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.SUBSCRIPTIONS_VIEW),
    handle(input.controller.listSubscriptions)
  );

  router.post(
    '/admin/subscriptions/:subscriptionId/override',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE),
    handle(input.controller.overrideSubscription)
  );

  // System Settings & Feature Flags
  router.get(
    '/admin/system-settings',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.SETTINGS_MANAGE),
    handle(input.controller.listSystemSettings)
  );

  router.post(
    '/admin/system-settings',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.SETTINGS_MANAGE),
    handle(input.controller.updateSystemSetting)
  );

  router.get(
    '/admin/feature-flags',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.FEATURE_FLAGS_MANAGE),
    handle(input.controller.listFeatureFlags)
  );

  router.post(
    '/admin/feature-flags',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.FEATURE_FLAGS_MANAGE),
    handle(input.controller.updateFeatureFlag)
  );

  // Audit Logs & Security Events
  router.get(
    '/admin/audit-logs',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW),
    handle(input.controller.listAuditLogs)
  );

  router.get(
    '/admin/security-events',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.SECURITY_EVENTS_VIEW),
    handle(input.controller.listSecurityEvents)
  );

  router.post(
    '/admin/security-events/:eventId/resolve',
    auth,
    requirePlatformPermission(input.prisma, PLATFORM_PERMISSIONS.SECURITY_EVENTS_VIEW),
    handle(input.controller.resolveSecurityEvent)
  );

  return router;
}
