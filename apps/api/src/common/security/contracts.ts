import type { BusinessPermission, PlatformPermission } from '@warrantypass/shared';

export interface AccessTokenClaims {
  subject: string;
  sessionId: string;
  kind: 'CUSTOMER' | 'PLATFORM_ADMIN';
  issuedAt: number;
  expiresAt: number;
}

export interface AccessTokenResult {
  token: string;
  expiresAt: Date;
}

export interface AuthenticationContext {
  userId: string;
  sessionId: string;
  kind: 'CUSTOMER' | 'PLATFORM_ADMIN';
}

export interface BusinessAuthorizationContext {
  userId: string;
  sessionId: string;
  businessId: string;
  membershipId: string;
  permissions: ReadonlySet<BusinessPermission>;
  isOwner: boolean;
}

export interface PlatformAuthorizationContext {
  userId: string;
  sessionId: string;
  permissions: ReadonlySet<PlatformPermission>;
}

export interface AuditEvent {
  actorUserId?: string | undefined;
  businessId?: string | undefined;
  action: string;
  resourceType: string;
  resourceId?: string | undefined;
  requestId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, string | number | boolean | null> | undefined;
}

export interface AuditWriter {
  write(event: AuditEvent): Promise<void>;
}
