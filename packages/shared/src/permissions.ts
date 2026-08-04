export const BUSINESS_PERMISSIONS = {
  BUSINESS_VIEW: 'business.view',
  BUSINESS_UPDATE: 'business.update',
  BUSINESS_SETTINGS_MANAGE: 'business.settings.manage',
  BUSINESS_SUBSCRIPTION_VIEW: 'business.subscription.view',
  BUSINESS_SUBSCRIPTION_MANAGE: 'business.subscription.manage',
  MEMBERS_VIEW: 'members.view',
  MEMBERS_INVITE: 'members.invite',
  MEMBERS_UPDATE: 'members.update',
  MEMBERS_SUSPEND: 'members.suspend',
  MEMBERS_REMOVE: 'members.remove',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN: 'roles.assign',
  WARRANTIES_VIEW: 'warranties.view',
  WARRANTIES_CREATE: 'warranties.create',
  WARRANTIES_UPDATE: 'warranties.update',
  WARRANTIES_REVOKE: 'warranties.revoke',
  CLAIMS_VIEW: 'claims.view',
  CLAIMS_REVIEW: 'claims.review',
  CLAIMS_UPDATE: 'claims.update',
  CLAIMS_ASSIGN: 'claims.assign',
  SERVICE_CENTERS_VIEW: 'service_centers.view',
  SERVICE_CENTERS_MANAGE: 'service_centers.manage',
  RECALLS_VIEW: 'recalls.view',
  RECALLS_MANAGE: 'recalls.manage',
  AUDIT_LOGS_VIEW: 'audit_logs.view',
} as const;

export type BusinessPermission = (typeof BUSINESS_PERMISSIONS)[keyof typeof BUSINESS_PERMISSIONS];

export const PLATFORM_PERMISSIONS = {
  DASHBOARD_VIEW: 'platform.dashboard.view',
  USERS_VIEW: 'platform.users.view',
  BUSINESSES_VIEW: 'platform.businesses.view',
  BUSINESSES_REVIEW: 'platform.businesses.review',
  BUSINESSES_VERIFY: 'platform.businesses.verify',
  BUSINESSES_REJECT: 'platform.businesses.reject',
  BUSINESSES_SUSPEND: 'platform.businesses.suspend',
  AUDIT_LOGS_VIEW: 'platform.audit_logs.view',
  ADMINS_MANAGE: 'platform.admins.manage',
} as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS];

/** @deprecated Use BUSINESS_PERMISSIONS. Kept as a compatibility export for Part 1 consumers. */
export const PERMISSIONS = BUSINESS_PERMISSIONS;
export type PermissionKey = BusinessPermission;

export const DEFAULT_ROLE_KEYS = {
  BUSINESS_OWNER: 'system:business-owner',
  BUSINESS_ADMIN: 'system:business-admin',
  MANAGER: 'system:manager',
  WARRANTY_OFFICER: 'system:warranty-officer',
  SUPPORT_AGENT: 'system:support-agent',
  SERVICE_CENTER_AGENT: 'system:service-center-agent',
  TECHNICIAN: 'system:technician',
  READ_ONLY: 'system:read-only',
} as const;

export const PLATFORM_ROLE_KEYS = {
  SUPER_ADMIN: 'platform:super-admin',
  VERIFICATION_REVIEWER: 'platform:verification-reviewer',
  SUPPORT: 'platform:support',
  READ_ONLY_AUDITOR: 'platform:read-only-auditor',
} as const;
