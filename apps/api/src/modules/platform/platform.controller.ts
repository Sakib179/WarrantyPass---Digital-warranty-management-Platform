import type { NextFunction, Request, Response } from 'express';

import type { BusinessApplicationService } from '../businesses/business-application.service.js';
import { requestMetadata } from '../../common/security/request-metadata.js';
import type { PlatformService } from './platform.service.js';

export class PlatformController {
  public constructor(
    private readonly service: PlatformService,
    private readonly applications: BusinessApplicationService,
  ) {}

  public dashboard = async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: await this.service.dashboard(), meta: {} });
  };

  public queue = async (req: Request, res: Response): Promise<void> => {
    const status = req.query.status;
    const statuses =
      typeof status === 'string'
        ? (status.split(',') as Parameters<PlatformService['verificationQueue']>[0])
        : undefined;
    res.json({ success: true, data: await this.service.verificationQueue(statuses), meta: {} });
  };

  public application = async (req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: await this.service.applicationDetail(routeParam(req, 'businessId')),
      meta: {},
    });
  };

  public document = async (req: Request, res: Response): Promise<void> => {
    const document = await this.applications.downloadDocument(
      routeParam(req, 'businessId'),
      routeParam(req, 'documentId'),
      requirePlatform(req).userId,
      requestMetadata(req),
    );
    res.setHeader('content-type', document.mimeType);
    res.setHeader(
      'content-disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(document.displayName)}`,
    );
    res.setHeader('cache-control', 'private, no-store');
    res.send(document.body);
  };

  public claim = async (req: Request, res: Response): Promise<void> => {
    await this.service.claim(
      routeParam(req, 'businessId'),
      requirePlatform(req).userId,
      (req.body as { internalNote: string }).internalNote,
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Application claimed for review.' }, meta: {} });
  };

  public approve = async (req: Request, res: Response): Promise<void> => {
    await this.service.approve(
      routeParam(req, 'businessId'),
      requirePlatform(req).userId,
      (req.body as { reviewerNote: string }).reviewerNote,
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Business verified.' }, meta: {} });
  };

  public moreInformation = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { userVisibleReason: string; internalNote: string };
    await this.service.requestMoreInformation(
      routeParam(req, 'businessId'),
      requirePlatform(req).userId,
      body.userVisibleReason,
      body.internalNote,
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Information request sent.' }, meta: {} });
  };

  public reject = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      category: string;
      userVisibleReason: string;
      internalNote: string;
    };
    await this.service.reject(
      routeParam(req, 'businessId'),
      requirePlatform(req).userId,
      body.category,
      body.userVisibleReason,
      body.internalNote,
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Business application rejected.' }, meta: {} });
  };

  public suspend = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { userVisibleReason: string; internalNote: string };
    await this.service.suspend(
      routeParam(req, 'businessId'),
      requirePlatform(req).userId,
      body.userVisibleReason,
      body.internalNote,
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Business suspended.' }, meta: {} });
  };

  public restore = async (req: Request, res: Response): Promise<void> => {
    await this.service.restore(
      routeParam(req, 'businessId'),
      requirePlatform(req).userId,
      (req.body as { internalNote: string }).internalNote,
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Business restored.' }, meta: {} });
  };

  public auditLogs = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await this.service.auditLogs(page, pageSize);
    res.json({
      success: true,
      data: result.items,
      meta: {
        page,
        pageSize,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  };

  public users = async (req: Request, res: Response): Promise<void> => {
    const search = req.query.search;
    res.json({
      success: true,
      data: await this.service.userLookup(typeof search === 'string' ? search : ''),
      meta: {},
    });
  };

  public handleError =
    (handler: (request: Request, response: Response) => Promise<void>) =>
    (request: Request, response: Response, next: NextFunction): void => {
      void handler(request, response).catch(next);
    };
}

function requirePlatform(req: Request): NonNullable<Request['platformAuth']> {
  if (!req.platformAuth) {
    throw new Error('Platform authorization middleware did not set the request context.');
  }
  return req.platformAuth;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === 'string' ? value : '';
}
