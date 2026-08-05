import type { Request, Response } from 'express';
import type { RecallService } from './recall.service.js';
import { extractBusinessAuth } from '../../common/middleware/authorization.js';
import { createRecallNoticeSchema, acknowledgeRecallSchema } from '@warrantypass/validation';
import { AppError } from '../../common/errors/app-error.js';

export class RecallController {
  public constructor(private readonly recallService: RecallService) {}

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

  public createRecallNotice = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const parse = createRecallNoticeSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid recall notice payload', statusCode: 400 });
    }
    const notice = await this.recallService.createRecallNotice(auth, parse.data);
    res.status(201).json({ success: true, data: notice, meta: {} });
  };

  public publishRecallNotice = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const recallId = req.params.recallId as string;
    const result = await this.recallService.publishRecallNotice(auth, recallId);
    res.json({ success: true, data: result.notice, meta: { targetCount: result.targetCount } });
  };

  public listBusinessRecalls = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const recalls = await this.recallService.listBusinessRecalls(auth);
    res.json({ success: true, data: recalls, meta: {} });
  };

  public listCustomerRecalls = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const recalls = await this.recallService.listCustomerRecalls(userId);
    res.json({ success: true, data: recalls, meta: {} });
  };

  public getCustomerRecall = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const recallId = req.params.recallId as string;
    const recall = await this.recallService.getCustomerRecallById(userId, recallId);
    res.json({ success: true, data: recall, meta: {} });
  };

  public acknowledgeRecall = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const recallId = req.params.recallId as string;
    const parse = acknowledgeRecallSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid acknowledgement payload', statusCode: 400 });
    }
    const ack = await this.recallService.acknowledgeRecall(userId, recallId, parse.data);
    res.json({ success: true, data: ack, meta: {} });
  };
}
