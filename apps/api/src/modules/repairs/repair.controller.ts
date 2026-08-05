import type { Request, Response } from 'express';
import type { RepairService } from './repair.service.js';
import { extractBusinessAuth } from '../../common/middleware/authorization.js';
import { createRepairRecordSchema, updateRepairRecordSchema, updateRepairStatusSchema } from '@warrantypass/validation';
import { AppError } from '../../common/errors/app-error.js';

export class RepairController {
  public constructor(private readonly repairService: RepairService) {}

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

  public createRepair = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const parse = createRepairRecordSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid repair record payload', statusCode: 400 });
    }
    const repair = await this.repairService.createRepair(auth, parse.data);
    res.status(201).json({ success: true, data: repair, meta: {} });
  };

  public listBusinessRepairs = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const { status, serviceCenterId } = req.query;
    const filters: { status?: string; serviceCenterId?: string } = {};
    if (status) filters.status = String(status);
    if (serviceCenterId) filters.serviceCenterId = String(serviceCenterId);

    const repairs = await this.repairService.listBusinessRepairs(auth, filters);
    res.json({ success: true, data: repairs, meta: {} });
  };

  public getBusinessRepair = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const repairId = req.params.repairId as string;
    const repair = await this.repairService.getBusinessRepairById(auth, repairId);
    res.json({ success: true, data: repair, meta: {} });
  };

  public updateRepairStatus = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const repairId = req.params.repairId as string;
    const parse = updateRepairStatusSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid repair status update payload', statusCode: 400 });
    }
    const updated = await this.repairService.updateRepairStatus(auth, repairId, parse.data);
    res.json({ success: true, data: updated, meta: {} });
  };

  public updateRepairDetails = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const repairId = req.params.repairId as string;
    const parse = updateRepairRecordSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid repair update payload', statusCode: 400 });
    }
    const updated = await this.repairService.updateRepairDetails(auth, repairId, parse.data);
    res.json({ success: true, data: updated, meta: {} });
  };

  public listCustomerRepairs = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const repairs = await this.repairService.listCustomerRepairs(userId);
    res.json({ success: true, data: repairs, meta: {} });
  };

  public getCustomerRepair = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const repairId = req.params.repairId as string;
    const repair = await this.repairService.getCustomerRepairById(userId, repairId);
    res.json({ success: true, data: repair, meta: {} });
  };
}
