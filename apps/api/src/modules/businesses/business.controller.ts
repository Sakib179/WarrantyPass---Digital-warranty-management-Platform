import type { NextFunction, Request, Response } from 'express';

import { requestMetadata } from '../../common/security/request-metadata.js';
import type { BusinessApplicationService } from './business-application.service.js';
import type { MembershipService } from './membership.service.js';

export class BusinessController {
  public constructor(
    private readonly applications: BusinessApplicationService,
    private readonly memberships: MembershipService,
  ) {}

  public register = async (req: Request, res: Response): Promise<void> => {
    const data = await this.applications.register(
      req.body as Parameters<BusinessApplicationService['register']>[0],
      requestMetadata(req),
    );
    res.status(201).json({ success: true, data, meta: {} });
  };

  public getApplication = async (req: Request, res: Response): Promise<void> => {
    const context = requireBusiness(req);
    const data = await this.applications.getApplication(context.businessId, context.userId);
    res.json({ success: true, data, meta: {} });
  };

  public updateApplication = async (req: Request, res: Response): Promise<void> => {
    const context = requireBusiness(req);
    const versionHeader = req.get('if-match');
    const expectedVersion = versionHeader ? Number(versionHeader.replaceAll('"', '')) : undefined;
    const data = await this.applications.updateDraft(
      context.businessId,
      context.userId,
      req.body as Parameters<BusinessApplicationService['updateDraft']>[2],
      Number.isInteger(expectedVersion) ? expectedVersion : undefined,
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public uploadDocument = async (req: Request, res: Response): Promise<void> => {
    const context = requireBusiness(req);
    if (!req.file) throw new Error('Upload middleware did not provide a file.');
    const data = await this.applications.uploadDocument(
      context.businessId,
      context.userId,
      (req.body as { kind: 'TRADE_LICENSE' | 'BIN' | 'SUPPORTING' }).kind,
      {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        body: req.file.buffer,
      },
      requestMetadata(req),
    );
    res.status(201).json({ success: true, data, meta: {} });
  };

  public removeDocument = async (req: Request, res: Response): Promise<void> => {
    const context = requireBusiness(req);
    await this.applications.removeDocument(
      context.businessId,
      context.userId,
      routeParam(req, 'documentId'),
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Document removed.' }, meta: {} });
  };

  public downloadDocument = async (req: Request, res: Response): Promise<void> => {
    const context = requireBusiness(req);
    const document = await this.applications.downloadDocument(
      context.businessId,
      routeParam(req, 'documentId'),
      context.userId,
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

  public submit = async (req: Request, res: Response): Promise<void> => {
    const context = requireBusiness(req);
    const data = await this.applications.submit(
      context.businessId,
      context.userId,
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public switchBusiness = async (req: Request, res: Response): Promise<void> => {
    const data = await this.applications.switchBusiness(
      requireAuth(req).userId,
      (req.body as { businessId: string }).businessId,
    );
    res.json({ success: true, data, meta: {} });
  };

  public listMembers = async (req: Request, res: Response): Promise<void> => {
    const data = await this.memberships.listMembers(requireBusiness(req));
    res.json({ success: true, data, meta: {} });
  };

  public listInvitations = async (req: Request, res: Response): Promise<void> => {
    const data = await this.memberships.listInvitations(requireBusiness(req));
    res.json({ success: true, data, meta: {} });
  };

  public invite = async (req: Request, res: Response): Promise<void> => {
    const data = await this.memberships.invite(
      requireBusiness(req),
      req.body as Parameters<MembershipService['invite']>[1],
      requestMetadata(req),
    );
    res.status(201).json({ success: true, data, meta: {} });
  };

  public resendInvitation = async (req: Request, res: Response): Promise<void> => {
    const data = await this.memberships.resendInvitation(
      requireBusiness(req),
      routeParam(req, 'invitationId'),
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public revokeInvitation = async (req: Request, res: Response): Promise<void> => {
    await this.memberships.revokeInvitation(
      requireBusiness(req),
      routeParam(req, 'invitationId'),
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Invitation revoked.' }, meta: {} });
  };

  public acceptInvitation = async (req: Request, res: Response): Promise<void> => {
    const data = await this.memberships.acceptInvitation(
      requireAuth(req).userId,
      (req.body as { token: string }).token,
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public listRoles = async (req: Request, res: Response): Promise<void> => {
    const data = await this.memberships.listRoles(requireBusiness(req));
    res.json({ success: true, data, meta: {} });
  };

  public createRole = async (req: Request, res: Response): Promise<void> => {
    const data = await this.memberships.createRole(
      requireBusiness(req),
      req.body as Parameters<MembershipService['createRole']>[1],
      requestMetadata(req),
    );
    res.status(201).json({ success: true, data, meta: {} });
  };

  public updateRole = async (req: Request, res: Response): Promise<void> => {
    const data = await this.memberships.updateRole(
      requireBusiness(req),
      routeParam(req, 'roleId'),
      req.body as Parameters<MembershipService['updateRole']>[2],
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public deleteRole = async (req: Request, res: Response): Promise<void> => {
    await this.memberships.deleteRole(
      requireBusiness(req),
      routeParam(req, 'roleId'),
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Role deleted.' }, meta: {} });
  };

  public assignRoles = async (req: Request, res: Response): Promise<void> => {
    await this.memberships.assignRoles(
      requireBusiness(req),
      routeParam(req, 'memberId'),
      (req.body as { roleIds: string[] }).roleIds,
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Member roles updated.' }, meta: {} });
  };

  public memberStatus = async (req: Request, res: Response): Promise<void> => {
    const action = routeParam(req, 'action');
    if (action !== 'suspend' && action !== 'restore' && action !== 'remove') {
      throw new Error('Invalid member action reached the controller.');
    }
    await this.memberships.setMemberStatus(
      requireBusiness(req),
      routeParam(req, 'memberId'),
      action,
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Member status updated.' }, meta: {} });
  };

  public handleError =
    (handler: (request: Request, response: Response) => Promise<void>) =>
    (request: Request, response: Response, next: NextFunction): void => {
      void handler(request, response).catch(next);
    };
}

function requireAuth(req: Request): NonNullable<Request['auth']> {
  if (!req.auth) throw new Error('Authentication middleware did not set the request context.');
  return req.auth;
}

function requireBusiness(req: Request): NonNullable<Request['businessAuth']> {
  if (!req.businessAuth) {
    throw new Error('Business authorization middleware did not set the request context.');
  }
  return req.businessAuth;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === 'string' ? value : '';
}
