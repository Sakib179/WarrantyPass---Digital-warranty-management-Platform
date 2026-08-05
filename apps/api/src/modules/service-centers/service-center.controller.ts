import type { Request, Response } from 'express';
import type { ServiceCenterService } from './service-center.service.js';
import { extractBusinessAuth } from '../../common/middleware/authorization.js';
import { createServiceCenterSchema, updateServiceCenterSchema, assignClaimServiceCenterSchema } from '@warrantypass/validation';
import { AppError } from '../../common/errors/app-error.js';

export class ServiceCenterController {
  public constructor(private readonly serviceCenterService: ServiceCenterService) {}

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

  public createServiceCenter = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const parse = createServiceCenterSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid service center payload', statusCode: 400 });
    }
    const center = await this.serviceCenterService.createServiceCenter(auth, parse.data);
    res.status(201).json({ success: true, data: center, meta: {} });
  };

  public listBusinessServiceCenters = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const centers = await this.serviceCenterService.listBusinessServiceCenters(auth);
    res.json({ success: true, data: centers, meta: {} });
  };

  public getServiceCenter = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const serviceCenterId = req.params.serviceCenterId as string;
    const center = await this.serviceCenterService.getServiceCenterById(auth, serviceCenterId);
    res.json({ success: true, data: center, meta: {} });
  };

  public updateServiceCenter = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const serviceCenterId = req.params.serviceCenterId as string;
    const parse = updateServiceCenterSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid update payload', statusCode: 400 });
    }
    const updated = await this.serviceCenterService.updateServiceCenter(auth, serviceCenterId, parse.data);
    res.json({ success: true, data: updated, meta: {} });
  };

  public searchCustomerServiceCenters = async (req: Request, res: Response): Promise<void> => {
    const { district, division, area, search } = req.query;
    const filters: { district?: string; division?: string; area?: string; search?: string } = {};
    if (district) filters.district = String(district);
    if (division) filters.division = String(division);
    if (area) filters.area = String(area);
    if (search) filters.search = String(search);

    const centers = await this.serviceCenterService.searchCustomerServiceCenters(filters);
    res.json({ success: true, data: centers, meta: {} });
  };

  public assignClaimServiceCenter = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const claimId = req.params.claimId as string;
    const parse = assignClaimServiceCenterSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError({ code: 'BAD_REQUEST', message: 'Invalid claim assignment payload', statusCode: 400 });
    }
    const assignment = await this.serviceCenterService.assignServiceCenterToClaim(auth, claimId, parse.data);
    res.status(201).json({ success: true, data: assignment, meta: {} });
  };
}
