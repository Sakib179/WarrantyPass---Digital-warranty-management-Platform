import type { BusinessStatus } from './statuses.js';

export interface PlatformDashboardDto {
  pendingApplications: number;
  applicationsInReview: number;
  moreInformationRequests: number;
  verifiedBusinesses: number;
  suspendedBusinesses: number;
  recentSecurityEvents: number;
}

export interface VerificationQueueItemDto {
  businessId: string;
  displayName: string;
  legalName: string;
  referenceNumber: string | null;
  status: BusinessStatus;
  duplicateIdentifierFlag: boolean;
  submittedAt: string | null;
  claimedBy: string | null;
}

export interface AuditLogDto {
  id: string;
  action: string;
  actorEmail: string | null;
  businessId: string | null;
  targetType: string;
  targetId: string | null;
  requestId: string | null;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null> | null;
}
