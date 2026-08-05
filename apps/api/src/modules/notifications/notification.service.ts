import type { PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../../common/errors/app-error.js';
import type { UpdateNotificationPreferencesInput } from '@warrantypass/validation';

export interface DispatchNotificationOptions {
  recipientUserId: string;
  businessId?: string | null;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  idempotencyKey?: string | null;
  isSecurityOrSafety?: boolean;
}

export class NotificationService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async dispatchNotification(options: DispatchNotificationOptions) {
    // 1. Idempotency Check
    if (options.idempotencyKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { idempotencyKey: options.idempotencyKey },
      });
      if (existing) return existing;
    }

    // 2. Preference evaluation (Security & Critical Safety bypass opt-out!)
    let pref = await this.prisma.notificationPreference.findUnique({
      where: { userId: options.recipientUserId },
    });

    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: { userId: options.recipientUserId },
      });
    }

    // Unless security/safety event or in-app enabled, respect preferences
    if (!options.isSecurityOrSafety && !pref.inAppEnabled) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        recipientUserId: options.recipientUserId,
        businessId: options.businessId ?? null,
        type: options.type,
        title: options.title,
        message: options.message,
        actionUrl: options.actionUrl ?? null,
        relatedEntityType: options.relatedEntityType ?? null,
        relatedEntityId: options.relatedEntityId ?? null,
        severity: options.severity ?? 'INFO',
        idempotencyKey: options.idempotencyKey ?? null,
        deliveries: {
          create: [
            {
              channel: 'IN_APP',
              status: 'DELIVERED',
              deliveredAt: new Date(),
            },
            ...(pref.emailEnabled || options.isSecurityOrSafety
              ? [
                  {
                    channel: 'EMAIL' as const,
                    status: 'PENDING' as const,
                  },
                ]
              : []),
          ],
        },
      },
    });

    return notification;
  }

  public async listUserNotifications(userId: string, filters: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: any = {
      recipientUserId: userId,
      archivedAt: null,
      ...(filters.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { recipientUserId: userId, readAt: null, archivedAt: null },
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
    };
  }

  public async listBusinessNotifications(businessId: string, filters: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: any = {
      businessId,
      archivedAt: null,
      ...(filters.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { businessId, readAt: null, archivedAt: null },
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
    };
  }

  public async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
    });

    if (!notification) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Notification not found', statusCode: 404 });
    }

    return await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  public async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  public async getUserPreferences(userId: string) {
    let pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return pref;
  }

  public async updateUserPreferences(userId: string, input: UpdateNotificationPreferencesInput) {
    const updated = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: { ...input },
      create: { userId, ...input },
    });

    return updated;
  }
}
