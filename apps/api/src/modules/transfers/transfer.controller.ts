import type { Request, Response } from 'express';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { TransferService } from './transfer.service.js';
import type { TransferEligibilityService } from './transfer-eligibility.service.js';
import { extractBusinessAuth } from '../../common/middleware/authorization.js';
import {
  initiateTransferSchema,
  respondTransferSchema,
  businessReviewTransferSchema,
  updateBusinessTransferPolicySchema,
} from '@warrantypass/validation';
import { AppError } from '../../common/errors/app-error.js';

export class TransferController {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly transferService: TransferService,
    private readonly eligibilityService: TransferEligibilityService
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

  public checkEligibility = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const productId = req.params.productId as string;
    const result = await this.eligibilityService.evaluateEligibility(userId, productId);
    res.json({ success: true, data: result, meta: {} });
  };

  public initiateTransfer = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError({ code: 'AUTH_TOKEN_INVALID', message: 'User not found', statusCode: 401 });

    const parse = initiateTransferSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid transfer initiation payload', statusCode: 400 });
    }
    const result = await this.transferService.initiateTransfer(user.id, user.email, parse.data);
    res.status(201).json({ success: true, data: result.transfer, meta: { rawInvitationToken: result.rawToken } });
  };

  public respondToTransfer = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError({ code: 'AUTH_TOKEN_INVALID', message: 'User not found', statusCode: 401 });

    const transferId = req.params.transferId as string;
    const parse = respondTransferSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid transfer response payload', statusCode: 400 });
    }
    const updated = await this.transferService.respondToTransfer(user.id, user.email, transferId, parse.data);
    res.json({ success: true, data: updated, meta: {} });
  };

  public listCustomerTransfers = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError({ code: 'AUTH_TOKEN_INVALID', message: 'User not found', statusCode: 401 });

    const transfers = await this.transferService.listCustomerTransfers(user.id, user.email);
    res.json({ success: true, data: transfers, meta: {} });
  };

  public listBusinessTransfers = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const transfers = await this.transferService.listBusinessTransfers(auth);
    res.json({ success: true, data: transfers, meta: {} });
  };

  public reviewBusinessTransfer = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const transferId = req.params.transferId as string;
    const parse = businessReviewTransferSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid business review payload', statusCode: 400 });
    }
    const updated = await this.transferService.businessReviewTransfer(auth, transferId, parse.data);
    res.json({ success: true, data: updated, meta: {} });
  };

  public getBusinessTransferPolicy = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const policy = await this.transferService.getBusinessTransferPolicy(auth);
    res.json({ success: true, data: policy, meta: {} });
  };

  public updateBusinessTransferPolicy = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const parse = updateBusinessTransferPolicySchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid policy payload', statusCode: 400 });
    }
    const policy = await this.transferService.updateBusinessTransferPolicy(auth, parse.data);
    res.json({ success: true, data: policy, meta: {} });
  };
}
