import type { Request, Response } from 'express';
import type { ClaimService } from './claim.service.js';
import { extractBusinessAuth } from '../../common/middleware/authorization.js';
import { requestMetadata } from '../../common/security/request-metadata.js';
import { AppError } from '../../common/errors/app-error.js';

export class ClaimController {
  public constructor(private readonly claimService: ClaimService) {}

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

  // --------------------------------------------------
  // CUSTOMER ENDPOINTS
  // --------------------------------------------------

  public listCustomerClaims = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const { page, pageSize, status } = req.query;
    const result = await this.claimService.listCustomerClaims(userId, {
      ...(page ? { page: Number(page) } : {}),
      ...(pageSize ? { pageSize: Number(pageSize) } : {}),
      ...(status ? { status: String(status) } : {}),
    });
    res.json({ success: true, data: result.items, meta: { pagination: result.pagination } });
  };

  public getCustomerClaim = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const claimId = req.params.claimId as string;
    const claim = await this.claimService.getCustomerClaimById(userId, claimId);
    res.json({ success: true, data: claim, meta: {} });
  };

  public submitClaim = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const metadata = requestMetadata(req);
    const claim = await this.claimService.submitClaim(userId, req.body, metadata);
    res.status(201).json({ success: true, data: claim, meta: {} });
  };

  public cancelCustomerClaim = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const metadata = requestMetadata(req);
    const claimId = req.params.claimId as string;
    const claim = await this.claimService.cancelCustomerClaim(userId, claimId, req.body, metadata);
    res.json({ success: true, data: claim, meta: {} });
  };

  public postCustomerMessage = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.userId;
    const claimId = req.params.claimId as string;
    await this.claimService.postMessage(userId, null, claimId, {
      ...req.body,
      isInternalNote: false,
    });
    res.json({ success: true, data: { message: 'Message posted' }, meta: {} });
  };

  // --------------------------------------------------
  // BUSINESS ENDPOINTS
  // --------------------------------------------------

  public listBusinessClaims = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const { page, pageSize, status, assignedMemberId, search } = req.query;
    const result = await this.claimService.listBusinessClaims(auth, {
      ...(page ? { page: Number(page) } : {}),
      ...(pageSize ? { pageSize: Number(pageSize) } : {}),
      ...(status ? { status: String(status) } : {}),
      ...(assignedMemberId ? { assignedMemberId: String(assignedMemberId) } : {}),
      ...(search ? { search: String(search) } : {}),
    });
    res.json({ success: true, data: result.items, meta: { pagination: result.pagination } });
  };

  public getBusinessClaim = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const claimId = req.params.claimId as string;
    const claim = await this.claimService.getBusinessClaimById(auth, claimId);
    res.json({ success: true, data: claim, meta: {} });
  };

  public updateClaimStatus = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const claimId = req.params.claimId as string;
    const claim = await this.claimService.updateClaimStatus(auth, claimId, req.body, metadata);
    res.json({ success: true, data: claim, meta: {} });
  };

  public assignClaim = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const claimId = req.params.claimId as string;
    const claim = await this.claimService.assignClaim(auth, claimId, req.body, metadata);
    res.json({ success: true, data: claim, meta: {} });
  };

  public postBusinessMessage = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const claimId = req.params.claimId as string;
    await this.claimService.postMessage(auth.userId, auth.businessId, claimId, req.body);
    res.json({ success: true, data: { message: 'Message posted' }, meta: {} });
  };
}
