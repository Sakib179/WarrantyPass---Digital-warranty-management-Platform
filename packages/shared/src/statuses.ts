export const USER_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const BUSINESS_STATUSES = [
  'DRAFT',
  'PENDING',
  'IN_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED',
  'DEACTIVATED',
] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const MEMBER_STATUSES = ['INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const WARRANTY_LABELS = [
  'VERIFIED_BY_BUSINESS',
  'USER_UPLOADED',
  'VERIFICATION_PENDING',
  'EXPIRED',
  'INVALID',
  'REVOKED',
] as const;
export type WarrantyLabel = (typeof WARRANTY_LABELS)[number];

export const DISPLAY_STATUSES = [
  'ACTIVE',
  'PENDING',
  'IN_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'VERIFIED',
  'USER_UPLOADED',
  'EXPIRED',
  'INVALID',
  'REJECTED',
  'SUSPENDED',
  'DEACTIVATED',
  'DRAFT',
  'INVITED',
  'REMOVED',
  'REVOKED',
  'COMPLETED',
] as const;
export type DisplayStatus = (typeof DISPLAY_STATUSES)[number];

export const statusLabels: Record<DisplayStatus, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending verification',
  IN_REVIEW: 'In review',
  MORE_INFORMATION_REQUIRED: 'More information required',
  VERIFIED: 'Verified',
  USER_UPLOADED: 'User Uploaded',
  EXPIRED: 'Expired',
  INVALID: 'Invalid',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
  DRAFT: 'Draft',
  INVITED: 'Invited',
  REMOVED: 'Removed',
  REVOKED: 'Revoked',
  COMPLETED: 'Completed',
};

export function isDisplayStatus(value: string): value is DisplayStatus {
  return DISPLAY_STATUSES.some((status) => status === value);
}
