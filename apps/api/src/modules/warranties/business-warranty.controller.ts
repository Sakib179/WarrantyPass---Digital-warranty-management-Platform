import type { Request, Response } from 'express';
import type { BusinessWarrantyService } from './business-warranty.service.js';
import { extractBusinessAuth } from '../../common/middleware/authorization.js';
import { requestMetadata } from '../../common/security/request-metadata.js';
import { AppError } from '../../common/errors/app-error.js';

export class BusinessWarrantyController {
  public constructor(private readonly warrantyService: BusinessWarrantyService) {}

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

  public listWarranties = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const { search, productId, status, verificationLabel, serialNumber, warrantyNumber } = req.query;
    const warranties = await this.warrantyService.listWarranties(auth, {
      ...(search ? { search: String(search) } : {}),
      ...(productId ? { productId: String(productId) } : {}),
      ...(status ? { status: String(status) } : {}),
      ...(verificationLabel ? { verificationLabel: String(verificationLabel) } : {}),
      ...(serialNumber ? { serialNumber: String(serialNumber) } : {}),
      ...(warrantyNumber ? { warrantyNumber: String(warrantyNumber) } : {}),
    });
    res.json({ success: true, data: warranties, meta: {} });
  };

  public getWarranty = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const warrantyId = req.params.warrantyId as string;
    const warranty = await this.warrantyService.getWarrantyById(auth, warrantyId);
    res.json({ success: true, data: warranty, meta: {} });
  };

  public issueWarranty = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const warranty = await this.warrantyService.issueWarranty(auth, req.body, metadata);
    res.status(201).json({ success: true, data: warranty, meta: {} });
  };

  public correctWarranty = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const warrantyId = req.params.warrantyId as string;
    const warranty = await this.warrantyService.correctWarranty(auth, warrantyId, req.body, metadata);
    res.json({ success: true, data: warranty, meta: {} });
  };

  public revokeWarranty = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const warrantyId = req.params.warrantyId as string;
    const warranty = await this.warrantyService.revokeWarranty(auth, warrantyId, req.body, metadata);
    res.json({ success: true, data: warranty, meta: {} });
  };
}
