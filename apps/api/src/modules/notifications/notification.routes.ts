import { Router } from 'express';
import type { NotificationController } from './notification.controller.js';
import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { TokenService } from '../../common/security/token.service.js';
import { requireAuthentication } from '../../common/middleware/authentication.js';
import { requireBusinessMembership } from '../../common/middleware/authorization.js';

export function createNotificationRouter(input: {
  controller: NotificationController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const business = requireBusinessMembership(input.prisma);
  const handle = input.controller.handleError;

  // Customer notification routes
  router.get('/customer/notifications', auth, handle(input.controller.listCustomerNotifications));
  router.post('/customer/notifications/:notificationId/read', auth, handle(input.controller.markAsRead));
  router.post('/customer/notifications/read-all', auth, handle(input.controller.markAllAsRead));

  // Preferences routes
  router.get('/customer/notification-preferences', auth, handle(input.controller.getUserPreferences));
  router.put('/customer/notification-preferences', auth, handle(input.controller.updateUserPreferences));

  // Business notification routes
  router.get('/business/notifications', auth, business, handle(input.controller.listBusinessNotifications));

  return router;
}
