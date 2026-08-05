import { Router } from 'express';

import type { AppConfig } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { AuditWriter } from '../common/security/contracts.js';
import { Argon2PasswordHasher } from '../common/security/password.js';
import {
  createRateLimitPolicies,
  type RateLimitStoreFactory,
} from '../common/security/rate-limit.js';
import { requireAuthentication } from '../common/middleware/authentication.js';
import { requireBusinessMembership } from '../common/middleware/authorization.js';
import { TokenService } from '../common/security/token.service.js';
import type { EmailProvider } from '../infrastructure/email/email-provider.js';
import type { StorageProvider } from '../infrastructure/storage/storage-provider.js';
import { AuthController } from './auth/auth.controller.js';
import { createAuthRouter } from './auth/auth.routes.js';
import { AuthService } from './auth/auth.service.js';
import { BusinessApplicationService } from './businesses/business-application.service.js';
import { BusinessController } from './businesses/business.controller.js';
import { createBusinessRouter } from './businesses/business.routes.js';
import { MembershipService } from './businesses/membership.service.js';
import { PlatformController } from './platform/platform.controller.js';
import { createPlatformRouter } from './platform/platform.routes.js';
import { PlatformService } from './platform/platform.service.js';
import { MockBillingProvider } from './customer/billing.provider.js';
import { CustomerController } from './customer/customer.controller.js';
import { createCustomerRouter } from './customer/customer.routes.js';
import { CustomerService } from './customer/customer.service.js';
import { MockDocumentExtractionProvider } from './customer/document-extraction.provider.js';

import { ProductService } from './products/product.service.js';
import { ProductController } from './products/product.controller.js';
import { createProductRouter } from './products/product.routes.js';

import { WarrantyTemplateService } from './warranty-templates/warranty-template.service.js';
import { WarrantyTemplateController } from './warranty-templates/warranty-template.controller.js';
import { createWarrantyTemplateRouter } from './warranty-templates/warranty-template.routes.js';

import { SubscriptionEntitlementService } from './businesses/subscription-entitlement.service.js';
import { BusinessWarrantyService } from './warranties/business-warranty.service.js';
import { BusinessWarrantyController } from './warranties/business-warranty.controller.js';
import { createBusinessWarrantyRouter } from './warranties/business-warranty.routes.js';

import { ClaimEligibilityService } from './claims/claim-eligibility.service.js';
import { ClaimService } from './claims/claim.service.js';
import { ClaimController } from './claims/claim.controller.js';
import { createClaimRouter } from './claims/claim.routes.js';

import { ServiceCenterService } from './service-centers/service-center.service.js';
import { ServiceCenterController } from './service-centers/service-center.controller.js';
import { createServiceCenterRouter } from './service-centers/service-center.routes.js';

import { RepairService } from './repairs/repair.service.js';
import { RepairController } from './repairs/repair.controller.js';
import { createRepairRouter } from './repairs/repair.routes.js';

import { TransferEligibilityService } from './transfers/transfer-eligibility.service.js';
import { TransferService } from './transfers/transfer.service.js';
import { TransferController } from './transfers/transfer.controller.js';
import { createTransferRouter } from './transfers/transfer.routes.js';

import { VerificationService } from './verification/verification.service.js';
import { VerificationController } from './verification/verification.controller.js';
import { createVerificationRouter } from './verification/verification.routes.js';

import { RecallService } from './recalls/recall.service.js';
import { RecallController } from './recalls/recall.controller.js';
import { createRecallRouter } from './recalls/recall.routes.js';

import { NotificationService } from './notifications/notification.service.js';
import { NotificationController } from './notifications/notification.controller.js';
import { createNotificationRouter } from './notifications/notification.routes.js';

import { AdminOverviewService } from './admin/admin-overview.service.js';
import { AdminService } from './admin/admin.service.js';
import { AdminController } from './admin/admin.controller.js';
import { createAdminRouter } from './admin/admin.routes.js';

import { PrivacyService } from './privacy/privacy.service.js';
import { PrivacyController } from './privacy/privacy.controller.js';
import { createPrivacyRouter } from './privacy/privacy.routes.js';

export function createV1FeatureRouter(input: {
  config: AppConfig;
  prisma: PrismaClient;
  email: EmailProvider;
  storage: StorageProvider;
  audit: AuditWriter;
  rateLimitStoreFactory?: RateLimitStoreFactory;
}): Router {
  const router = Router();
  const tokens = new TokenService(input.config);
  const passwords = new Argon2PasswordHasher(input.config);
  const rateLimits = createRateLimitPolicies(input.config, input.rateLimitStoreFactory);

  const authService = new AuthService(
    input.prisma,
    input.config,
    tokens,
    passwords,
    input.email,
    input.audit,
  );
  const applicationService = new BusinessApplicationService(
    input.prisma,
    input.config,
    tokens,
    passwords,
    input.email,
    input.storage,
    input.audit,
  );
  const membershipService = new MembershipService(
    input.prisma,
    input.config,
    tokens,
    input.email,
    input.audit,
  );
  const platformService = new PlatformService(input.prisma, input.config, input.email, input.audit);
  const customerService = new CustomerService(
    input.prisma,
    input.config,
    input.storage,
    new MockDocumentExtractionProvider(),
    new MockBillingProvider(input.config.BILLING_WEBHOOK_SECRET),
    input.audit,
  );

  const productService = new ProductService(input.prisma, input.config, input.audit);
  const templateService = new WarrantyTemplateService(input.prisma, input.config, input.audit);
  const entitlementService = new SubscriptionEntitlementService(input.prisma);
  const businessWarrantyService = new BusinessWarrantyService(
    input.prisma,
    input.config,
    input.email,
    input.audit,
    entitlementService,
  );
  const eligibilityService = new ClaimEligibilityService(input.prisma);
  const claimService = new ClaimService(input.prisma, input.config, input.audit, eligibilityService);

  const serviceCenterService = new ServiceCenterService(input.prisma);
  const repairService = new RepairService(input.prisma);
  const transferEligibilityService = new TransferEligibilityService(input.prisma);
  const transferService = new TransferService(input.prisma, transferEligibilityService);
  const verificationService = new VerificationService(input.prisma);
  const recallService = new RecallService(input.prisma);

  const notificationService = new NotificationService(input.prisma);
  const adminOverviewService = new AdminOverviewService(input.prisma);
  const adminService = new AdminService(input.prisma);
  const privacyService = new PrivacyService(input.prisma);

  const authController = new AuthController(authService, input.config);
  const businessController = new BusinessController(applicationService, membershipService);
  const platformController = new PlatformController(platformService, applicationService);
  const customerController = new CustomerController(customerService);
  const productController = new ProductController(productService);
  const templateController = new WarrantyTemplateController(templateService);
  const businessWarrantyController = new BusinessWarrantyController(businessWarrantyService);
  const claimController = new ClaimController(claimService);
  const serviceCenterController = new ServiceCenterController(serviceCenterService);
  const repairController = new RepairController(repairService);
  const transferController = new TransferController(input.prisma, transferService, transferEligibilityService);
  const verificationController = new VerificationController(verificationService);
  const recallController = new RecallController(recallService);

  const notificationController = new NotificationController(notificationService);
  const adminController = new AdminController(adminOverviewService, adminService);
  const privacyController = new PrivacyController(privacyService);

  router.use(
    createAuthRouter({
      controller: authController,
      config: input.config,
      prisma: input.prisma,
      tokens,
      rateLimits,
    }),
  );
  router.use(
    createBusinessRouter({
      controller: businessController,
      config: input.config,
      prisma: input.prisma,
      tokens,
      rateLimits,
    }),
  );
  router.use(
    createPlatformRouter({
      controller: platformController,
      config: input.config,
      prisma: input.prisma,
      tokens,
      rateLimits,
    }),
  );
  router.use(
    createCustomerRouter({
      controller: customerController,
      config: input.config,
      prisma: input.prisma,
      tokens,
      rateLimits,
    }),
  );
  router.use(
    createProductRouter({
      controller: productController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createWarrantyTemplateRouter({
      controller: templateController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createBusinessWarrantyRouter({
      controller: businessWarrantyController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createClaimRouter({
      controller: claimController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createServiceCenterRouter({
      controller: serviceCenterController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createRepairRouter({
      controller: repairController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createTransferRouter({
      controller: transferController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createVerificationRouter({
      controller: verificationController,
    }),
  );
  router.use(
    createRecallRouter({
      controller: recallController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createNotificationRouter({
      controller: notificationController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createAdminRouter({
      controller: adminController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );
  router.use(
    createPrivacyRouter({
      controller: privacyController,
      config: input.config,
      prisma: input.prisma,
      tokens,
    }),
  );

  // Business subscription entitlement endpoint
  const auth = requireAuthentication(input.prisma, tokens);
  const business = requireBusinessMembership(input.prisma);
  router.get('/business/subscription', auth, business, async (req, res) => {
    const entitlement = await entitlementService.getBusinessEntitlement(req.businessAuth!.businessId);
    res.json({ success: true, data: entitlement, meta: {} });
  });

  // Health and Readiness endpoints
  router.get('/health/live', (_req, res) => {
    res.json({ status: 'live', timestamp: new Date().toISOString() });
  });

  router.get('/health/ready', async (_req, res) => {
    try {
      await input.prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: err.message });
    }
  });

  router.get('/health/dependencies', async (_req, res) => {
    let dbStatus = 'ok';
    try {
      await input.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }
    res.json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      dependencies: {
        database: dbStatus,
        storage: 'ok',
        email: 'ok',
      },
    });
  });

  return router;
}
