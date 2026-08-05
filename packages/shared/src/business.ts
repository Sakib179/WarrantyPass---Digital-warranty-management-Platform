import type { BusinessStatus, InvitationStatus, MemberStatus } from './statuses.js';

export interface BusinessRegistrationResultDto {
  userId: string;
  businessId: string;
  email: string;
  status: 'DRAFT';
  emailVerificationRequired: true;
  message: string;
}

export interface NotificationDto {
  id: string;
  recipientUserId: string;
  businessId?: string | null;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  readAt?: string | null;
  createdAt: string;
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

export interface ProductDto {
  id: string;
  businessId: string | null;
  brandId: string | null;
  brandName?: string | null;
  categoryId: string;
  categoryName?: string | null;
  name: string;
  modelNumber: string | null;
  sku: string | null;
  description: string | null;
  productImageFileId: string | null;
  defaultWarrantyDuration: number | null;
  defaultWarrantyDurationUnit: 'DAYS' | 'MONTHS' | 'YEARS' | null;
  defaultCoverageType: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyTemplateDto {
  id: string;
  businessId: string;
  productId: string | null;
  productName?: string | null;
  name: string;
  durationValue: number;
  durationUnit: 'DAYS' | 'MONTHS' | 'YEARS';
  coverageType: string;
  termsSummary: string;
  termsDocumentFileId: string | null;
  exclusions: string | null;
  serviceInstructions: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface IssuedWarrantyDto {
  id: string;
  businessId: string;
  customerUserId: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  warrantyNumber: string;
  verificationCode: string;
  serialNumber: string;
  productName: string;
  modelNumber: string | null;
  purchaseDate: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  status: string;
  verificationLabel: string;
  termsSummary: string;
  isPendingRecipient: boolean;
  createdAt: string;
}

export interface BusinessSubscriptionEntitlementDto {
  planKey: string;
  planName: string;
  status: string;
  maxWarrantiesPerMonth: number;
  issuedWarrantiesThisMonth: number;
  remainingWarrantiesThisMonth: number;
  maxEmployees: number;
  currentEmployees: number;
  maxTemplates: number;
  currentTemplates: number;
  maxStorageMb: number;
  claimManagementAccess: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface ClaimAttachmentDto {
  id: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: string;
  createdAt: string;
}

export interface ClaimMessageDto {
  id: string;
  claimId: string;
  senderUserId: string;
  senderName: string;
  senderType: 'CUSTOMER' | 'BUSINESS_EMPLOYEE' | 'SYSTEM';
  isInternalNote: boolean;
  message: string;
  createdAt: string;
  attachments: ClaimAttachmentDto[];
}

export interface ClaimStatusHistoryDto {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByName: string;
  publicNote: string | null;
  internalNote?: string | null; // Only present for business employees
  createdAt: string;
}

export interface BusinessClaimDetailDto {
  id: string;
  businessId: string;
  warrantyId: string;
  referenceNumber: string;
  status: string;
  subject: string;
  description: string;
  problemStartDate: string | null;
  productCondition: string | null;
  preferredContactMethod: string | null;
  customerPhone: string | null;
  preferredServiceLocation: string | null;
  rejectionCategory: string | null;
  rejectionReason: string | null;
  moreInfoRequestedNotes: string | null;
  moreInfoDeadline: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  closedAt: string | null;
  submittedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  warranty: {
    warrantyNumber: string;
    productName: string;
    modelNumber: string | null;
    serialNumber: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
    verificationLabel: string;
  };
  assignedMember: {
    id: string;
    name: string;
    email: string;
    roleName: string;
  } | null;
  statusHistory: ClaimStatusHistoryDto[];
  messages: ClaimMessageDto[];
  attachments: ClaimAttachmentDto[];
}

export interface ServiceCenterDto {
  id: string;
  businessId: string;
  name: string;
  serviceCenterCode: string;
  phone: string;
  email: string | null;
  addressLine: string;
  area: string;
  district: string;
  division: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: string;
  serviceInstructions: string | null;
  status: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  supportedCategories?: Array<{ id: string; name: string }>;
  supportedBrands?: Array<{ id: string; name: string }>;
  memberCount?: number;
  businessName?: string;
}

export interface RepairDocumentDto {
  id: string;
  repairId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isCustomerVisible: boolean;
  uploadedByUserId: string;
  createdAt: string;
}

export interface RepairStatusHistoryDto {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string;
  changedByName?: string;
  customerVisibleNote: string | null;
  internalNote?: string | null;
  createdAt: string;
}

export interface RepairRecordDto {
  id: string;
  repairNumber: string;
  customerProductId: string;
  warrantyId: string | null;
  claimId: string | null;
  businessId: string;
  serviceCenterId: string;
  serviceCenterName?: string;
  technicianMemberId: string | null;
  technicianName?: string | null;
  reportedProblem: string;
  diagnosis: string | null;
  workPerformed: string | null;
  partsReplaced: string | null;
  warrantyCoverageStatus: string;
  laborCostCents: number;
  partsCostCents: number;
  totalCostCents: number;
  receivedAt: string | null;
  repairStartedAt: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  currentStatus: string;
  customerVisibleNote: string | null;
  internalNote?: string | null;
  createdAt: string;
  updatedAt: string;
  productName?: string;
  customerName?: string;
  statusHistory?: RepairStatusHistoryDto[];
  documents?: RepairDocumentDto[];
}

export interface BusinessTransferPolicyDto {
  id: string;
  businessId: string;
  isTransferAllowed: boolean;
  requireBusinessApproval: boolean;
  maxTransfersPerWarranty: number;
  minRemainingDaysRequired: number;
  transferRepairHistoryAllowed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OwnershipTransferDto {
  id: string;
  transferNumber: string;
  customerProductId: string;
  warrantyId: string;
  businessId: string;
  senderUserId: string;
  senderName?: string;
  recipientEmail: string;
  recipientUserId: string | null;
  recipientName?: string | null;
  status: string;
  rejectionReason: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  businessApprovedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  productName?: string;
  brandName?: string;
  serialNumberMasked?: string;
}

export interface RecallNoticeDto {
  id: string;
  businessId: string;
  businessName?: string;
  title: string;
  publicReferenceNumber: string;
  severity: string;
  noticeType: string;
  description: string;
  customerInstructions: string;
  affectedBrandId: string | null;
  affectedModelNumbers: string[];
  affectedSerialNumberRanges: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  status: string;
  createdByUserId: string;
  createdAt: string;
  recipientCount?: number;
  acknowledgementCount?: number;
  acknowledgedAt?: string | null;
}

