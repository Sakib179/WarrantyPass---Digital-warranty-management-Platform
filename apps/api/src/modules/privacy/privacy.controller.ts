import type { Request, Response } from 'express';
import type { PrivacyService } from './privacy.service.js';
import { createPrivacyRequestSchema } from '@warrantypass/validation';
import { AppError } from '../../common/errors/app-error.js';

export class PrivacyController {
  public constructor(private readonly privacyService: PrivacyService) {}

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

  public createPrivacyRequest = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const parse = createPrivacyRequestSchema.safeParse(req.body);
    if (!parse.success) throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid payload', statusCode: 400 });
    const request = await this.privacyService.createPrivacyRequest(userId, parse.data);
    res.status(201).json({ success: true, data: request, meta: {} });
  };

  public listPrivacyRequests = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const requests = await this.privacyService.listUserPrivacyRequests(userId);
    res.json({ success: true, data: requests, meta: {} });
  };

  public exportUserData = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const payload = await this.privacyService.exportUserDataPayload(userId);
    res.json({ success: true, data: payload, meta: {} });
  };
}
