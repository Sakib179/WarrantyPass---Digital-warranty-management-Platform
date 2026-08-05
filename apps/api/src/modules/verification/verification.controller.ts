import type { Request, Response } from 'express';
import type { VerificationService } from './verification.service.js';
import { verifyWarrantySchema } from '@warrantypass/validation';
import { AppError } from '../../common/errors/app-error.js';

export class VerificationController {
  public constructor(private readonly verificationService: VerificationService) {}

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

  public verifyWarranty = async (req: Request, res: Response): Promise<void> => {
    const parse = verifyWarrantySchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid verification query payload', statusCode: 400 });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.verificationService.verifyWarranty(parse.data, ipAddress, userAgent);
    res.json({ success: true, data: result, meta: {} });
  };
}
