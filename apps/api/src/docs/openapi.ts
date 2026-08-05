import type { AppConfig } from '../config/env.js';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface OperationOptions {
  tag: string;
  summary: string;
  method?: HttpMethod;
  secured?: boolean;
  csrf?: boolean;
  upload?: boolean;
}

const jsonContent = {
  'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } },
};

function operation({
  tag,
  summary,
  method = 'get',
  secured = false,
  csrf = false,
  upload = false,
}: OperationOptions): Record<HttpMethod, unknown> {
  return {
    [method]: {
      tags: [tag],
      summary,
      ...(secured ? { security: [{ bearerAuth: [] }] } : {}),
      ...(csrf
        ? {
            parameters: [
              {
                name: 'X-CSRF-Token',
                in: 'header',
                required: true,
                schema: { type: 'string' },
                description: 'Must match the readable CSRF cookie.',
              },
            ],
          }
        : {}),
      ...(upload
        ? {
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    required: ['kind', 'document'],
                    properties: {
                      kind: {
                        type: 'string',
                        enum: [
                          'TRADE_LICENSE',
                          'BIN',
                          'SUPPORTING',
                          'WARRANTY_CARD',
                          'INVOICE',
                          'RECEIPT',
                          'PRODUCT_IMAGE',
                          'OTHER',
                        ],
                      },
                      document: { type: 'string', format: 'binary' },
                    },
                  },
                },
              },
            },
          }
        : {}),
      responses: {
        '200': { description: 'Successful response', content: jsonContent },
        '400': { $ref: '#/components/responses/ApiError' },
        '401': { $ref: '#/components/responses/ApiError' },
        '403': { $ref: '#/components/responses/ApiError' },
        '429': { $ref: '#/components/responses/ApiError' },
      },
    },
  } as Record<HttpMethod, unknown>;
}

export function createOpenApiDocument(config: AppConfig): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'WarrantyPass API',
      version: config.APP_VERSION,
      description:
        'Versioned REST API for WarrantyPass identity, sessions, business onboarding, tenant RBAC, and platform verification.',
      contact: { name: 'WarrantyPass Engineering' },
    },
    servers: [{ url: `${config.API_URL}/api/v1`, description: config.NODE_ENV }],
    tags: [
      { name: 'Operations' },
      { name: 'Authentication' },
      { name: 'Account' },
      { name: 'Business verification' },
      { name: 'Business access' },
      { name: 'Platform administration' },
      { name: 'Customer wallet' },
      { name: 'Manual Warranty Vault' },
      { name: 'Customer billing' },
      { name: 'Product catalog' },
    ],
    paths: {
      '/health': operation({ tag: 'Operations', summary: 'API process health' }),
      '/health/database': operation({ tag: 'Operations', summary: 'PostgreSQL connectivity' }),
      '/version': operation({ tag: 'Operations', summary: 'Release version information' }),

      '/auth/register': operation({
        tag: 'Authentication',
        summary: 'Register customer',
        method: 'post',
      }),
      '/auth/register/business': operation({
        tag: 'Authentication',
        summary: 'Create business owner and draft',
        method: 'post',
      }),
      '/auth/email/verify': operation({
        tag: 'Authentication',
        summary: 'Consume email verification token',
        method: 'post',
      }),
      '/auth/email/resend': operation({
        tag: 'Authentication',
        summary: 'Resend verification without account disclosure',
        method: 'post',
      }),
      '/auth/login': operation({
        tag: 'Authentication',
        summary: 'Create session',
        method: 'post',
      }),
      '/auth/refresh': operation({
        tag: 'Authentication',
        summary: 'Rotate refresh token',
        method: 'post',
        csrf: true,
      }),
      '/auth/logout': operation({
        tag: 'Authentication',
        summary: 'End current session',
        method: 'post',
        csrf: true,
      }),
      '/auth/logout-all': operation({
        tag: 'Authentication',
        summary: 'End every session',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/auth/me': operation({
        tag: 'Authentication',
        summary: 'Current account and authorized contexts',
        secured: true,
      }),
      '/auth/password/forgot': operation({
        tag: 'Authentication',
        summary: 'Request generic password recovery',
        method: 'post',
      }),
      '/auth/password/reset': operation({
        tag: 'Authentication',
        summary: 'Consume password reset token',
        method: 'post',
      }),
      '/auth/password/change': operation({
        tag: 'Account',
        summary: 'Change current password',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/auth/sessions': operation({
        tag: 'Account',
        summary: 'List active sessions',
        secured: true,
      }),
      '/auth/sessions/{sessionId}': operation({
        tag: 'Account',
        summary: 'Revoke a session',
        method: 'delete',
        secured: true,
        csrf: true,
      }),
      '/account/profile': {
        ...operation({
          tag: 'Account',
          summary: 'Update profile',
          method: 'patch',
          secured: true,
          csrf: true,
        }),
      },
      '/account/email/change': operation({
        tag: 'Account',
        summary: 'Request verified email change',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/account/email/verify': operation({
        tag: 'Account',
        summary: 'Confirm email change token',
        method: 'post',
      }),
      '/account/deactivate': operation({
        tag: 'Account',
        summary: 'Deactivate own account',
        method: 'post',
        secured: true,
        csrf: true,
      }),

      '/businesses/switch': operation({
        tag: 'Business access',
        summary: 'Select active business context',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/business/application': {
        ...operation({
          tag: 'Business verification',
          summary: 'Get current application',
          secured: true,
        }),
        ...operation({
          tag: 'Business verification',
          summary: 'Update editable application',
          method: 'patch',
          secured: true,
          csrf: true,
        }),
      },
      '/business/application/documents': operation({
        tag: 'Business verification',
        summary: 'Upload private verification document',
        method: 'post',
        secured: true,
        csrf: true,
        upload: true,
      }),
      '/business/application/documents/{documentId}': {
        ...operation({
          tag: 'Business verification',
          summary: 'Download owned private document',
          secured: true,
        }),
        ...operation({
          tag: 'Business verification',
          summary: 'Delete draft document',
          method: 'delete',
          secured: true,
          csrf: true,
        }),
      },
      '/business/application/submit': operation({
        tag: 'Business verification',
        summary: 'Submit complete application',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/business/members': operation({
        tag: 'Business access',
        summary: 'List members',
        secured: true,
      }),
      '/business/invitations': {
        ...operation({ tag: 'Business access', summary: 'List invitations', secured: true }),
        ...operation({
          tag: 'Business access',
          summary: 'Invite a member',
          method: 'post',
          secured: true,
          csrf: true,
        }),
      },
      '/business/invitations/{invitationId}/resend': operation({
        tag: 'Business access',
        summary: 'Rotate and resend invitation',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/business/invitations/{invitationId}': operation({
        tag: 'Business access',
        summary: 'Revoke invitation',
        method: 'delete',
        secured: true,
        csrf: true,
      }),
      '/business/invitations/accept': operation({
        tag: 'Business access',
        summary: 'Accept email-bound invitation',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/business/roles': {
        ...operation({ tag: 'Business access', summary: 'List roles', secured: true }),
        ...operation({
          tag: 'Business access',
          summary: 'Create custom role',
          method: 'post',
          secured: true,
          csrf: true,
        }),
      },
      '/business/roles/{roleId}': {
        ...operation({
          tag: 'Business access',
          summary: 'Update custom role',
          method: 'put',
          secured: true,
          csrf: true,
        }),
        ...operation({
          tag: 'Business access',
          summary: 'Delete unused custom role',
          method: 'delete',
          secured: true,
          csrf: true,
        }),
      },
      '/business/members/{memberId}/roles': operation({
        tag: 'Business access',
        summary: 'Assign member roles',
        method: 'put',
        secured: true,
        csrf: true,
      }),
      '/business/members/{memberId}/{action}': operation({
        tag: 'Business access',
        summary: 'Suspend, restore, or remove member',
        method: 'post',
        secured: true,
        csrf: true,
      }),

      '/platform/dashboard': operation({
        tag: 'Platform administration',
        summary: 'Platform dashboard totals',
        secured: true,
      }),
      '/platform/businesses': operation({
        tag: 'Platform administration',
        summary: 'Verification queues',
        secured: true,
      }),
      '/platform/businesses/{businessId}': operation({
        tag: 'Platform administration',
        summary: 'Private application detail and history',
        secured: true,
      }),
      '/platform/businesses/{businessId}/documents/{documentId}': operation({
        tag: 'Platform administration',
        summary: 'Download private review document',
        secured: true,
      }),
      '/platform/businesses/{businessId}/claim': operation({
        tag: 'Platform administration',
        summary: 'Claim application review',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/platform/businesses/{businessId}/approve': operation({
        tag: 'Platform administration',
        summary: 'Verify business',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/platform/businesses/{businessId}/more-information': operation({
        tag: 'Platform administration',
        summary: 'Request more information',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/platform/businesses/{businessId}/reject': operation({
        tag: 'Platform administration',
        summary: 'Reject application',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/platform/businesses/{businessId}/suspend': operation({
        tag: 'Platform administration',
        summary: 'Suspend verified business',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/platform/businesses/{businessId}/restore': operation({
        tag: 'Platform administration',
        summary: 'Restore suspended business',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/platform/audit-logs': operation({
        tag: 'Platform administration',
        summary: 'Paginated audit trail',
        secured: true,
      }),
      '/platform/users': operation({
        tag: 'Platform administration',
        summary: 'Restricted user lookup',
        secured: true,
      }),
      '/customer/dashboard': operation({
        tag: 'Customer wallet',
        summary: 'Customer-owned dashboard summary',
        secured: true,
      }),
      '/customer/products': operation({
        tag: 'Customer wallet',
        summary: 'Search, filter, sort, and paginate owned products',
        secured: true,
      }),
      '/customer/products/{id}': operation({
        tag: 'Customer wallet',
        summary: 'Owned product detail with full serial number',
        secured: true,
      }),
      '/customer/warranties': operation({
        tag: 'Customer wallet',
        summary: 'Search, filter, sort, and paginate owned warranties',
        secured: true,
      }),
      '/customer/warranties/{id}': operation({
        tag: 'Customer wallet',
        summary: 'Owned warranty detail and provenance',
        secured: true,
      }),
      '/customer/manual-products': operation({
        tag: 'Manual Warranty Vault',
        summary: 'Create a subscribed customer manual product and warranty transactionally',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/customer/manual-products/{id}': {
        ...operation({
          tag: 'Manual Warranty Vault',
          summary: 'Edit customer-entered fields',
          method: 'patch',
          secured: true,
          csrf: true,
        }),
        ...operation({
          tag: 'Manual Warranty Vault',
          summary: 'Archive a manual record',
          method: 'delete',
          secured: true,
          csrf: true,
        }),
      },
      '/customer/manual-products/{id}/documents': operation({
        tag: 'Manual Warranty Vault',
        summary: 'Upload a private warranty document',
        method: 'post',
        secured: true,
        csrf: true,
        upload: true,
      }),
      '/customer/warranty-documents/{id}': operation({
        tag: 'Manual Warranty Vault',
        summary: 'Remove a customer-owned manual document',
        method: 'delete',
        secured: true,
        csrf: true,
      }),
      '/customer/warranty-documents/{id}/access': operation({
        tag: 'Manual Warranty Vault',
        summary: 'Stream a private customer-owned document',
        secured: true,
      }),
      '/customer/document-extraction': operation({
        tag: 'Manual Warranty Vault',
        summary: 'Extract candidate fields for customer review',
        method: 'post',
        secured: true,
        csrf: true,
        upload: true,
      }),
      '/customer/document-extraction/{id}/confirm': operation({
        tag: 'Manual Warranty Vault',
        summary: 'Confirm corrected extracted fields',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/customer/subscription': operation({
        tag: 'Customer billing',
        summary: 'Current annual plan and backend entitlement state',
        secured: true,
      }),
      '/customer/subscription/checkout': operation({
        tag: 'Customer billing',
        summary: 'Start annual plan checkout',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/customer/subscription/cancel': operation({
        tag: 'Customer billing',
        summary: 'Cancel annual renewal at period end',
        method: 'post',
        secured: true,
        csrf: true,
      }),
      '/customer/payments': operation({
        tag: 'Customer billing',
        summary: 'Customer-owned payment history',
        secured: true,
      }),
      '/billing/webhooks/{provider}': operation({
        tag: 'Customer billing',
        summary: 'Signed idempotent billing provider webhook',
        method: 'post',
      }),
      '/catalog/brands': operation({
        tag: 'Product catalog',
        summary: 'Active product brands',
      }),
      '/catalog/categories': operation({
        tag: 'Product catalog',
        summary: 'Active product categories',
      }),
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Short-lived access token. Refresh tokens are never accepted here.',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          required: ['success', 'data', 'meta'],
          properties: {
            success: { type: 'boolean', const: true },
            data: {},
            meta: { type: 'object', additionalProperties: true },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { type: 'boolean', const: false },
            error: {
              type: 'object',
              required: ['code', 'message', 'details'],
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' },
                details: { type: 'array', items: {} },
              },
            },
          },
        },
      },
      responses: {
        ApiError: {
          description: 'Sanitized API error',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
          },
        },
      },
    },
  };
}
