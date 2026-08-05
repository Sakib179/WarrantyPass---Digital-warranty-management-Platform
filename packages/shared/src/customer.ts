export const WARRANTY_SOURCES = ['BUSINESS_ISSUED', 'USER_UPLOADED', 'PLATFORM_IMPORTED'] as const;
export type WarrantySourceDto = (typeof WARRANTY_SOURCES)[number];

export const WARRANTY_VERIFICATION_STATUSES = [
  'VERIFIED_BY_BUSINESS',
  'USER_UPLOADED',
  'VERIFICATION_PENDING',
  'UNVERIFIED',
  'REJECTED',
  'REVOKED',
] as const;
export type WarrantyVerificationStatusDto = (typeof WARRANTY_VERIFICATION_STATUSES)[number];

export const WARRANTY_OPERATIONAL_STATUSES = [
  'NOT_STARTED',
  'ACTIVE',
  'EXPIRING_SOON',
  'EXPIRED',
  'INVALID',
  'REVOKED',
  'VOIDED',
] as const;
export type WarrantyOperationalStatusDto = (typeof WARRANTY_OPERATIONAL_STATUSES)[number];

export const USER_UPLOADED_WARRANTY_LABEL = 'User Uploaded — Not Verified by Business';

export interface CatalogOptionDto {
  id: string;
  name: string;
  slug: string;
}

export interface CustomerDocumentDto {
  id: string;
  kind:
    | 'WARRANTY_CARD'
    | 'WARRANTY_PAPER'
    | 'INVOICE'
    | 'RECEIPT'
    | 'BUSINESS_VERIFICATION'
    | 'CLAIM_EVIDENCE'
    | 'REPAIR_RECEIPT'
    | 'PRODUCT_IMAGE'
    | 'OTHER';
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: 'UPLOADED' | 'PENDING_SCAN' | 'SAFE' | 'REJECTED' | 'DELETED';
  createdAt: string;
}

export interface CustomerProductListItemDto {
  id: string;
  productName: string;
  brand: CatalogOptionDto | null;
  category: CatalogOptionDto;
  modelNumber: string | null;
  maskedSerialNumber: string | null;
  purchaseDate: string;
  sellerName: string;
  source: WarrantySourceDto;
  ownershipStatus: 'ACTIVE' | 'ARCHIVED' | 'TRANSFERRED';
  warranty: CustomerWarrantySummaryDto | null;
  createdAt: string;
}

export interface CustomerWarrantySummaryDto {
  id: string;
  warrantyNumber: string | null;
  source: WarrantySourceDto;
  verificationStatus: WarrantyVerificationStatusDto;
  verificationLabel: string;
  operationalStatus: WarrantyOperationalStatusDto;
  startDate: string | null;
  endDate: string | null;
  remainingDays: number | null;
}

export interface CustomerProductDetailDto extends Omit<
  CustomerProductListItemDto,
  'maskedSerialNumber'
> {
  serialNumber: string | null;
  nickname: string | null;
  notes: string | null;
  warranties: CustomerWarrantyDetailDto[];
  documents: CustomerDocumentDto[];
}

export interface CustomerWarrantyDetailDto extends CustomerWarrantySummaryDto {
  product: {
    id: string;
    productName: string;
    brandName: string | null;
    categoryName: string;
    modelNumber: string | null;
    serialNumber: string | null;
    purchaseDate: string;
    sellerName: string;
  };
  issuingBusiness: { id: string; name: string } | null;
  durationValue: number | null;
  durationUnit: 'DAYS' | 'MONTHS' | 'YEARS' | null;
  coverageType:
    'MANUFACTURER' | 'SELLER' | 'LIMITED' | 'EXTENDED' | 'SERVICE_ONLY' | 'OTHER' | null;
  termsSummary: string | null;
  documents: CustomerDocumentDto[];
  createdAt: string;
}

export interface PaginatedDto<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CustomerDashboardDto {
  profileCompletion: number;
  counts: {
    products: number;
    warranties: number;
    active: number;
    expiringSoon: number;
    expired: number;
    verified: number;
    userUploaded: number;
  };
  recentProducts: CustomerProductListItemDto[];
  recentDocuments: CustomerDocumentDto[];
  manualVaultEntitled: boolean;
}

export interface CustomerSubscriptionDto {
  entitled: boolean;
  plan: {
    key: string;
    name: string;
    description: string;
    amount: string;
    currency: string;
    interval: 'MONTHLY' | 'YEARLY';
  };
  subscription: {
    id: string;
    status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export interface CustomerPaymentDto {
  id: string;
  paymentReference: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';
  paidAt: string | null;
  createdAt: string;
}

export interface ExtractedFieldDto {
  value: string;
  confidence: number;
}

export interface DocumentExtractionDto {
  id: string;
  status: 'COMPLETED' | 'CONFIRMED';
  provider: string;
  fields: Partial<
    Record<
      | 'productName'
      | 'brand'
      | 'modelNumber'
      | 'serialNumber'
      | 'purchaseDate'
      | 'invoiceNumber'
      | 'sellerName'
      | 'warrantyPeriod',
      ExtractedFieldDto
    >
  >;
  expiresAt: string;
  warning: string;
}

export interface CustomerClaimListItemDto {
  id: string;
  referenceNumber: string;
  warrantyId: string;
  productName: string;
  businessName: string;
  status: string;
  subject: string;
  submittedAt: string;
  updatedAt: string;
  requiresAction: boolean;
}

export interface CustomerClaimDetailDto {
  id: string;
  referenceNumber: string;
  warrantyId: string;
  warrantyNumber: string | null;
  productName: string;
  modelNumber: string | null;
  serialNumber: string | null;
  businessName: string;
  status: string;
  subject: string;
  description: string;
  problemStartDate: string | null;
  productCondition: string | null;
  preferredContactMethod: string | null;
  customerPhone: string | null;
  preferredServiceLocation: string | null;
  rejectionReason: string | null;
  moreInfoRequestedNotes: string | null;
  moreInfoDeadline: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  submittedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  statusTimeline: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    publicNote: string | null;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    senderName: string;
    senderType: 'CUSTOMER' | 'BUSINESS_EMPLOYEE' | 'SYSTEM';
    message: string;
    createdAt: string;
    attachments: Array<{
      id: string;
      storageKey: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  }>;
  attachments: Array<{
    id: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
}

