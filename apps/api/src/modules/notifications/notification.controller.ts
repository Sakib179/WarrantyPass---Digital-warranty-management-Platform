import type { Request, Response } from 'express';
import type { NotificationService } from './notification.service.js';
import { extractBusinessAuth } from '../../common/middleware/authorization.js';
import { updateNotificationPreferencesSchema } from '@warrantypass/validation';
import { AppError } from '../../common/errors/app-error.js';

export class NotificationController {
  public constructor(private readonly notificationService: NotificationService) {}

  public handleError(fn: (req: Request, res: Response) => Promise<void>) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        await fn(req, res);
      } catch (error) {
        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            error: { code: error.code, message: error.message, details: error.details },
          });
          return;
        }
        throw error;
      }
    };
  }

  public listCustomerNotifications = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const { unreadOnly, page, limit } = req.query;
    const result = await this.notificationService.listUserNotifications(userId, {
      unreadOnly: unreadOnly === 'true',
      page: page ? parseInt(String(page)) : 1,
      limit: limit ? parseInt(String(limit)) : 20,
    });
    res.json({ success: true, data: result.items, meta: { total: result.total, unreadCount: result.unreadCount, page: result.page, limit: result.limit } });
  };

  public listBusinessNotifications = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const { unreadOnly, page, limit } = req.query;
    const result = await this.notificationService.listBusinessNotifications(auth.businessId, {
      unreadOnly: unreadOnly === 'true',
      page: page ? parseInt(String(page)) : 1,
      limit: limit ? parseInt(String(limit)) : 20,
    });
    res.json({ success: true, data: result.items, meta: { total: result.total, unreadCount: result.unreadCount, page: result.page, limit: result.limit } });
  };

  public markAsRead = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const notificationId = req.params.notificationId as string;
    const updated = await this.notificationService.markAsRead(userId, notificationId);
    res.json({ success: true, data: updated, meta: {} });
  };

  public markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    await this.notificationService.markAllAsRead(userId);
    res.json({ success: true, data: { message: 'All notifications marked as read' }, meta: {} });
  };

  public getUserPreferences = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const pref = await this.notificationService.getUserPreferences(userId);
    res.json({ success: true, data: pref, meta: {} });
  };

  public updateUserPreferences = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const parse = updateNotificationPreferencesSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid preferences payload', statusCode: 400 });
    }
    const updated = await this.notificationService.updateUserPreferences(userId, parse.data);
    res.json({ success: true, data: updated, meta: {} });
  };
}
