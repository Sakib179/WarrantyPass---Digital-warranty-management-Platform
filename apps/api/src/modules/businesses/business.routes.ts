import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import {
  businessDraftSchema,
  businessRegistrationSchema,
  businessSwitchSchema,
  invitationSchema,
  invitationTokenSchema,
  roleAssignmentSchema,
  roleSchema,
  uuidSchema,
} from '@warrantypass/validation';
import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';

import type { AppConfig } from '../../config/env.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import {
  requireBusinessMembership,
  requireBusinessPermission,
  requireVerifiedBusiness,
} from '../../common/middleware/authorization.js';
import {
  requireAuthentication,
  requireVerifiedEmail,
} from '../../common/middleware/authentication.js';
import { requireCsrf } from '../../common/middleware/csrf.js';
import { validateRequest } from '../../common/middleware/validate-request.js';
import type { RateLimitPolicies } from '../../common/security/rate-limit.js';
import type { TokenService } from '../../common/security/token.service.js';
import type { BusinessController } from './business.controller.js';

export function createBusinessRouter(input: {
  controller: BusinessController;
  config: AppConfig;
  prisma: PrismaClient;
  tokens: TokenService;
  rateLimits: RateLimitPolicies;
}): Router {
  const router = Router();
  const auth = requireAuthentication(input.prisma, input.tokens);
  const verifiedEmail = requireVerifiedEmail(input.prisma);
  const business = requireBusinessMembership(input.prisma);
  const verifiedBusiness = requireVerifiedBusiness(input.prisma);
  const csrf = requireCsrf(input.config);
  const handle = input.controller.handleError;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: input.config.VERIFICATION_DOCUMENT_MAX_BYTES },
  });

  router.post(
    '/auth/register/business',
    input.rateLimits.registration,
    validateRequest('body', businessRegistrationSchema),
    handle(input.controller.register),
  );

  router.post(
    '/businesses/switch',
    auth,
    verifiedEmail,
    csrf,
    validateRequest('body', businessSwitchSchema),
    handle(input.controller.switchBusiness),
  );

  router.get(
    '/business/application',
    auth,
    verifiedEmail,
    business,
    handle(input.controller.getApplication),
  );
  router.patch(
    '/business/application',
    auth,
    verifiedEmail,
    business,
    csrf,
    validateRequest('body', businessDraftSchema),
    handle(input.controller.updateApplication),
  );
  router.post(
    '/business/application/documents',
    auth,
    verifiedEmail,
    business,
    csrf,
    input.rateLimits.upload,
    upload.single('document'),
    validateRequest('body', z.object({ kind: z.enum(['TRADE_LICENSE', 'BIN', 'SUPPORTING']) })),
    handle(input.controller.uploadDocument),
  );
  router.delete(
    '/business/application/documents/:documentId',
    auth,
    verifiedEmail,
    business,
    csrf,
    validateRequest('params', z.object({ documentId: uuidSchema })),
    handle(input.controller.removeDocument),
  );
  router.get(
    '/business/application/documents/:documentId',
    auth,
    verifiedEmail,
    business,
    validateRequest('params', z.object({ documentId: uuidSchema })),
    handle(input.controller.downloadDocument),
  );
  router.post(
    '/business/application/submit',
    auth,
    verifiedEmail,
    business,
    csrf,
    handle(input.controller.submit),
  );

  router.get(
    '/business/members',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.MEMBERS_VIEW),
    handle(input.controller.listMembers),
  );
  router.get(
    '/business/invitations',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.MEMBERS_VIEW),
    handle(input.controller.listInvitations),
  );
  router.post(
    '/business/invitations',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.MEMBERS_INVITE),
    csrf,
    input.rateLimits.invitation,
    validateRequest('body', invitationSchema),
    handle(input.controller.invite),
  );
  router.post(
    '/business/invitations/:invitationId/resend',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.MEMBERS_INVITE),
    csrf,
    validateRequest('params', z.object({ invitationId: uuidSchema })),
    handle(input.controller.resendInvitation),
  );
  router.delete(
    '/business/invitations/:invitationId',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.MEMBERS_INVITE),
    csrf,
    validateRequest('params', z.object({ invitationId: uuidSchema })),
    handle(input.controller.revokeInvitation),
  );
  router.post(
    '/business/invitations/accept',
    auth,
    verifiedEmail,
    csrf,
    input.rateLimits.invitationAcceptance,
    validateRequest('body', invitationTokenSchema),
    handle(input.controller.acceptInvitation),
  );

  router.get(
    '/business/roles',
    auth,
    verifiedEmail,
    business,
    requireBusinessPermission(BUSINESS_PERMISSIONS.ROLES_VIEW),
    handle(input.controller.listRoles),
  );
  router.post(
    '/business/roles',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.ROLES_CREATE),
    csrf,
    validateRequest('body', roleSchema),
    handle(input.controller.createRole),
  );
  router.put(
    '/business/roles/:roleId',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.ROLES_UPDATE),
    csrf,
    validateRequest('params', z.object({ roleId: uuidSchema })),
    validateRequest('body', roleSchema),
    handle(input.controller.updateRole),
  );
  router.delete(
    '/business/roles/:roleId',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.ROLES_DELETE),
    csrf,
    validateRequest('params', z.object({ roleId: uuidSchema })),
    handle(input.controller.deleteRole),
  );
  router.put(
    '/business/members/:memberId/roles',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireBusinessPermission(BUSINESS_PERMISSIONS.ROLES_ASSIGN),
    csrf,
    validateRequest('params', z.object({ memberId: uuidSchema })),
    validateRequest('body', roleAssignmentSchema),
    handle(input.controller.assignRoles),
  );
  router.post(
    '/business/members/:memberId/:action',
    auth,
    verifiedEmail,
    business,
    verifiedBusiness,
    requireMemberActionPermission(),
    csrf,
    validateRequest(
      'params',
      z.object({ memberId: uuidSchema, action: z.enum(['suspend', 'restore', 'remove']) }),
    ),
    handle(input.controller.memberStatus),
  );
  return router;
}

function requireMemberActionPermission(): RequestHandler {
  return (req, res, next): void => {
    const action = req.params.action;
    const permission =
      action === 'remove'
        ? BUSINESS_PERMISSIONS.MEMBERS_REMOVE
        : action === 'suspend'
          ? BUSINESS_PERMISSIONS.MEMBERS_SUSPEND
          : BUSINESS_PERMISSIONS.MEMBERS_UPDATE;
    requireBusinessPermission(permission)(req, res, next);
  };
}
