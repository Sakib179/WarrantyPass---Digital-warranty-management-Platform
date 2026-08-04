import type { BusinessStatus, WarrantyLabel } from './statuses.js';

export interface CustomerSummaryDto {
  id: string;
  email: string;
  displayName: string | null;
}

export interface BusinessSummaryDto {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
}

export interface WarrantySummaryDto {
  id: string;
  productName: string;
  issuerName: string | null;
  label: WarrantyLabel;
  issueDate: string;
  expiresAt: string | null;
}
