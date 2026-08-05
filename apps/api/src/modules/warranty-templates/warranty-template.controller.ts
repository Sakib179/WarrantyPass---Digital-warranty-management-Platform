import type { Request, Response } from 'express';
import type { WarrantyTemplateService } from './warranty-template.service.js';
import { extractBusinessAuth } from '../../common/middleware/authorization.js';
import { requestMetadata } from '../../common/security/request-metadata.js';
import { AppError } from '../../common/errors/app-error.js';

export class WarrantyTemplateController {
  public constructor(private readonly templateService: WarrantyTemplateService) {}

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

  public listTemplates = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const templates = await this.templateService.listTemplates(auth);
    res.json({ success: true, data: templates, meta: {} });
  };

  public getTemplate = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const templateId = req.params.templateId as string;
    const template = await this.templateService.getTemplateById(auth, templateId);
    res.json({ success: true, data: template, meta: {} });
  };

  public createTemplate = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const template = await this.templateService.createTemplate(auth, req.body, metadata);
    res.status(201).json({ success: true, data: template, meta: {} });
  };

  public updateTemplate = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const templateId = req.params.templateId as string;
    const template = await this.templateService.updateTemplate(auth, templateId, req.body, metadata);
    res.json({ success: true, data: template, meta: {} });
  };
}
