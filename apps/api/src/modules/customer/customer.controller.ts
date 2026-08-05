import type { NextFunction, Request, Response } from 'express';

import type { CustomerService } from './customer.service.js';

export class CustomerController {
  public constructor(private readonly service: CustomerService) {}

  public dashboard = async (req: Request, res: Response) =>
    success(res, await this.service.dashboard(userId(req)));
  public products = async (req: Request, res: Response) =>
    success(
      res,
      await this.service.listProducts(
        userId(req),
        req.query as unknown as Parameters<CustomerService['listProducts']>[1],
      ),
    );
  public product = async (req: Request, res: Response) =>
    success(res, await this.service.getProduct(userId(req), parameter(req, 'id')));
  public warranties = async (req: Request, res: Response) =>
    success(
      res,
      await this.service.listWarranties(
        userId(req),
        req.query as unknown as Parameters<CustomerService['listWarranties']>[1],
      ),
    );
  public warranty = async (req: Request, res: Response) =>
    success(res, await this.service.getWarranty(userId(req), parameter(req, 'id')));

  public createManual = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.createManual(
      userId(req),
      req.body as Parameters<CustomerService['createManual']>[1],
    );
    res.status(201).json({ success: true, data, meta: {} });
  };
  public updateManual = async (req: Request, res: Response) =>
    success(
      res,
      await this.service.updateManual(
        userId(req),
        parameter(req, 'id'),
        req.body as Parameters<CustomerService['updateManual']>[2],
      ),
    );
  public archiveManual = async (req: Request, res: Response) => {
    await this.service.archiveManual(userId(req), parameter(req, 'id'));
    success(res, { message: 'Manual warranty archived. Existing documents remain retained.' });
  };
  public uploadDocument = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw new Error('Upload middleware did not provide a file.');
    const data = await this.service.uploadDocument(
      userId(req),
      parameter(req, 'id'),
      (req.body as { kind: Parameters<CustomerService['uploadDocument']>[2] }).kind,
      req.file,
    );
    res.status(201).json({ success: true, data, meta: {} });
  };
  public removeDocument = async (req: Request, res: Response) => {
    await this.service.removeDocument(userId(req), parameter(req, 'id'));
    success(res, { message: 'Document removed.' });
  };
  public accessDocument = async (req: Request, res: Response): Promise<void> => {
    const document = await this.service.readDocument(userId(req), parameter(req, 'id'));
    res.setHeader('content-type', document.mimeType);
    res.setHeader(
      'content-disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(document.displayName)}`,
    );
    res.setHeader('cache-control', 'private, no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    res.send(document.body);
  };
  public extract = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw new Error('Upload middleware did not provide a file.');
    const data = await this.service.extractDocument(userId(req), req.file);
    res.status(201).json({ success: true, data, meta: {} });
  };
  public confirmExtraction = async (req: Request, res: Response) =>
    success(
      res,
      await this.service.confirmExtraction(
        userId(req),
        parameter(req, 'id'),
        (req.body as { fields: Record<string, string | undefined> }).fields,
      ),
    );
  public subscription = async (req: Request, res: Response) =>
    success(res, await this.service.subscription(userId(req)));
  public checkout = async (req: Request, res: Response) =>
    success(res, await this.service.checkout(userId(req)));
  public cancel = async (req: Request, res: Response) =>
    success(res, await this.service.cancelSubscription(userId(req)));
  public payments = async (req: Request, res: Response) =>
    success(res, await this.service.payments(userId(req)));
  public brands = async (req: Request, res: Response) =>
    success(res, await this.service.catalog('brands', queryString(req, 'search')));
  public categories = async (req: Request, res: Response) =>
    success(res, await this.service.catalog('categories', queryString(req, 'search')));
  public webhook = async (req: Request, res: Response) =>
    success(
      res,
      await this.service.processWebhook(
        parameter(req, 'provider'),
        req.rawBody ?? Buffer.from(JSON.stringify(req.body)),
        req.get('x-warrantypass-signature'),
        req.body as Parameters<CustomerService['processWebhook']>[3],
      ),
    );

  public handle =
    (handler: (request: Request, response: Response) => Promise<unknown>) =>
    (request: Request, response: Response, next: NextFunction): void => {
      void handler(request, response).catch(next);
    };
}

function userId(request: Request): string {
  if (!request.auth) throw new Error('Authentication middleware did not set the request context.');
  return request.auth.userId;
}

function parameter(request: Request, name: string): string {
  const value = request.params[name];
  if (!value) throw new Error(`Validated route parameter ${name} is missing.`);
  return Array.isArray(value) ? value[0]! : value;
}

function queryString(request: Request, name: string): string | undefined {
  const value = request.query[name];
  return typeof value === 'string' ? value : undefined;
}

function success(response: Response, data: unknown): void {
  response.json({ success: true, data, meta: {} });
}
