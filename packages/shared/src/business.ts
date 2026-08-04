import type { BusinessStatus, InvitationStatus, MemberStatus } from './statuses.js';

export interface BusinessRegistrationResultDto {
  userId: string;
  businessId: string;
  email: string;
  status: 'DRAFT';
  emailVerificationRequired: true;
  message: string;
}

export interface BusinessApplicationDto {
  id: string;
  slug: string;
  referenceNumber: string | null;
  status: BusinessStatus;
  statusVersion: number;
  ownerFullName: string;
  legalName: string;
  displayName: string;
  businessType: string;
  tradeLicenseNumber: string;
  binNumber: string | null;
  yearEstablished: number | null;
  phone: string;
  businessEmail: string;
  website: string | null;
  addressLine: string;
  area: string;
  district: string;
  division: string;
  postalCode: string | null;
  duplicateIdentifierFlag: boolean;
  submittedAt: string | null;
  userVisibleReason: string | null;
  documents: VerificationDocumentDto[];
}

export interface VerificationDocumentDto {
  id: string;
  kind: 'TRADE_LICENSE' | 'BIN' | 'SUPPORTING';
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: 'UPLOADED' | 'PENDING_SCAN' | 'SAFE' | 'REJECTED' | 'DELETED';
  createdAt: string;
}

export interface VerificationHistoryDto {
  id: string;
  previousStatus: BusinessStatus | null;
  newStatus: BusinessStatus;
  userVisibleReason: string | null;
  createdAt: string;
}

export interface BusinessMemberDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: MemberStatus;
  roles: Array<{ id: string; name: string }>;
  joinedAt: string | null;
  lastActiveAt: string | null;
}

export interface BusinessInvitationDto {
  id: string;
  email: string;
  role: { id: string; name: string };
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface BusinessRoleDto {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isProtected: boolean;
  permissions: string[];
  memberCount: number;
}
