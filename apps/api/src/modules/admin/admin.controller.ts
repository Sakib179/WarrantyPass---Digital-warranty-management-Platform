import type { Request, Response } from 'express';
import type { AdminOverviewService } from './admin-overview.service.js';
import type { AdminService } from './admin.service.js';
import {
  adminUserActionSchema,
  adminBusinessActionSchema,
  adminSubscriptionOverrideSchema,
  adminUpdateSystemSettingSchema,
  adminUpdateFeatureFlagSchema,
  adminResolveSecurityEventSchema,
} from '@warrantypass/validation';
import { AppError } from '../../common/errors/app-error.js';

export class AdminController {
  public constructor(
    private readonly overviewService: AdminOverviewService,
    private readonly adminService: AdminService
  ) {}

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

  public getOverview = async (_req: Request, res: Response): Promise<void> => {
    const metrics = await this.overviewService.getOperationalMetrics();
    res.json({ success: true, data: metrics, meta: {} });
  };

  public searchUsers = async (req: Request, res: Response): Promise<void> => {
    const { query } = req.query;
    const users = await this.adminService.searchUsers(query ? String(query) : undefined);
    res.json({ success: true, data: users, meta: {} });
  };

  public performUserAction = async (req: Request, res: Response): Promise<void> => {
    const adminUserId = req.auth!.userId;
    const userId = req.params.userId as string;
    const parse = adminUserActionSchema.safeParse(req.body);
    if (!parse.success) throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid payload', statusCode: 400 });
    const result = await this.adminService.performUserAction(adminUserId, userId, parse.data);
    res.json({ success: true, data: result, meta: {} });
  };

  public searchBusinesses = async (req: Request, res: Response): Promise<void> => {
    const { query } = req.query;
    const businesses = await this.adminService.searchBusinesses(query ? String(query) : undefined);
    res.json({ success: true, data: businesses, meta: {} });
  };

  public performBusinessAction = async (req: Request, res: Response): Promise<void> => {
    const adminUserId = req.auth!.userId;
    const businessId = req.params.businessId as string;
    const parse = adminBusinessActionSchema.safeParse(req.body);
    if (!parse.success) throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid payload', statusCode: 400 });
    const result = await this.adminService.performBusinessAction(adminUserId, businessId, parse.data);
    res.json({ success: true, data: result, meta: {} });
  };

  public listSubscriptions = async (_req: Request, res: Response): Promise<void> => {
    const subs = await this.adminService.listSubscriptions();
    res.json({ success: true, data: subs, meta: {} });
  };

  public overrideSubscription = async (req: Request, res: Response): Promise<void> => {
    const adminUserId = req.auth!.userId;
    const subscriptionId = req.params.subscriptionId as string;
    const parse = adminSubscriptionOverrideSchema.safeParse(req.body);
    if (!parse.success) throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid payload', statusCode: 400 });
    const updated = await this.adminService.overrideSubscription(adminUserId, subscriptionId, parse.data);
    res.json({ success: true, data: updated, meta: {} });
  };

  public listSystemSettings = async (_req: Request, res: Response): Promise<void> => {
    const settings = await this.adminService.listSystemSettings();
    res.json({ success: true, data: settings, meta: {} });
  };

  public updateSystemSetting = async (req: Request, res: Response): Promise<void> => {
    const adminUserId = req.auth!.userId;
    const parse = adminUpdateSystemSettingSchema.safeParse(req.body);
    if (!parse.success) throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid payload', statusCode: 400 });
    const setting = await this.adminService.updateSystemSetting(adminUserId, parse.data);
    res.json({ success: true, data: setting, meta: {} });
  };

  public listFeatureFlags = async (_req: Request, res: Response): Promise<void> => {
    const flags = await this.adminService.listFeatureFlags();
    res.json({ success: true, data: flags, meta: {} });
  };

  public updateFeatureFlag = async (req: Request, res: Response): Promise<void> => {
    const adminUserId = req.auth!.userId;
    const parse = adminUpdateFeatureFlagSchema.safeParse(req.body);
    if (!parse.success) throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid payload', statusCode: 400 });
    const flag = await this.adminService.updateFeatureFlag(adminUserId, parse.data);
    res.json({ success: true, data: flag, meta: {} });
  };

  public listAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const { action, resourceType, search } = req.query;
    const filters: { action?: string; resourceType?: string; search?: string } = {};
    if (action) filters.action = String(action);
    if (resourceType) filters.resourceType = String(resourceType);
    if (search) filters.search = String(search);

    const logs = await this.adminService.listAuditLogs(filters);
    res.json({ success: true, data: logs, meta: {} });
  };

  public listSecurityEvents = async (_req: Request, res: Response): Promise<void> => {
    const events = await this.adminService.listSecurityEvents();
    res.json({ success: true, data: events, meta: {} });
  };

  public resolveSecurityEvent = async (req: Request, res: Response): Promise<void> => {
    const adminUserId = req.auth!.userId;
    const eventId = req.params.eventId as string;
    const parse = adminResolveSecurityEventSchema.safeParse(req.body);
    if (!parse.success) throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid payload', statusCode: 400 });
    const updated = await this.adminService.resolveSecurityEvent(adminUserId, eventId, parse.data);
    res.json({ success: true, data: updated, meta: {} });
  };
}
