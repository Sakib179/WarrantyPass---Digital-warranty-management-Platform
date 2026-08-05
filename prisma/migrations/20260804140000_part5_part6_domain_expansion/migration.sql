-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('CUSTOMER', 'BUSINESS_EMPLOYEE', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClaimStatus" ADD VALUE 'DRAFT';
ALTER TYPE "ClaimStatus" ADD VALUE 'MORE_INFORMATION_REQUIRED';
ALTER TYPE "ClaimStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "ClaimStatus" ADD VALUE 'PRODUCT_RECEIVED';
ALTER TYPE "ClaimStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "ClaimStatus" ADD VALUE 'READY_FOR_COLLECTION';
ALTER TYPE "ClaimStatus" ADD VALUE 'CLOSED';

-- DropForeignKey
ALTER TABLE "Warranty" DROP CONSTRAINT "Warranty_customerUserId_fkey";

-- AlterTable
ALTER TABLE "CatalogProduct" ADD COLUMN     "createdByUserId" UUID,
ADD COLUMN     "defaultCoverageType" "WarrantyCoverageType",
ADD COLUMN     "defaultWarrantyDuration" INTEGER,
ADD COLUMN     "defaultWarrantyDurationUnit" "WarrantyDurationUnit",
ADD COLUMN     "productImageFileId" VARCHAR(500),
ADD COLUMN     "sku" VARCHAR(120),
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Warranty" ADD COLUMN     "catalogProductId" UUID,
ADD COLUMN     "idempotencyKey" VARCHAR(180),
ADD COLUMN     "revocationReason" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMPTZ(3),
ADD COLUMN     "revokedByUserId" UUID,
ADD COLUMN     "templateId" UUID,
ADD COLUMN     "templateVersion" INTEGER,
ALTER COLUMN "customerUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WarrantyClaim" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "closedAt" TIMESTAMPTZ(3),
ADD COLUMN     "customerPhone" VARCHAR(32),
ADD COLUMN     "moreInfoDeadline" TIMESTAMPTZ(3),
ADD COLUMN     "moreInfoRequestedNotes" TEXT,
ADD COLUMN     "preferredContactMethod" VARCHAR(60),
ADD COLUMN     "preferredServiceLocation" VARCHAR(220),
ADD COLUMN     "problemStartDate" DATE,
ADD COLUMN     "productCondition" VARCHAR(120),
ADD COLUMN     "rejectionCategory" VARCHAR(80),
ADD COLUMN     "rejectionReason" TEXT;

-- CreateTable
CREATE TABLE "WarrantyTemplate" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productId" UUID,
    "name" VARCHAR(180) NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" "WarrantyDurationUnit" NOT NULL,
    "coverageType" "WarrantyCoverageType" NOT NULL,
    "termsSummary" TEXT NOT NULL,
    "termsDocumentFileId" VARCHAR(500),
    "exclusions" TEXT,
    "serviceInstructions" TEXT,
    "status" "TemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "WarrantyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyTemplateVersion" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" "WarrantyDurationUnit" NOT NULL,
    "coverageType" "WarrantyCoverageType" NOT NULL,
    "termsSummary" TEXT NOT NULL,
    "termsDocumentFileId" VARCHAR(500),
    "exclusions" TEXT,
    "serviceInstructions" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarrantyTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingWarrantyRecipient" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "warrantyId" UUID NOT NULL,
    "invitationTokenHash" CHAR(64) NOT NULL,
    "customerName" VARCHAR(160),
    "customerPhone" VARCHAR(32),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "claimedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingWarrantyRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyRevision" (
    "id" UUID NOT NULL,
    "warrantyId" UUID NOT NULL,
    "correctedByUserId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "previousData" JSONB NOT NULL,
    "newData" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarrantyRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimAttachment" (
    "id" UUID NOT NULL,
    "claimId" UUID NOT NULL,
    "messageId" UUID,
    "uploadedByUserId" UUID NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" CHAR(64) NOT NULL,
    "scanStatus" "FileScanStatus" NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ClaimAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimMessage" (
    "id" UUID NOT NULL,
    "claimId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "senderType" "MessageSenderType" NOT NULL,
    "isInternalNote" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ClaimMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimAssignmentHistory" (
    "id" UUID NOT NULL,
    "claimId" UUID NOT NULL,
    "previousAssigneeMemberId" UUID,
    "newAssigneeMemberId" UUID,
    "assignedByUserId" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPlanEntitlement" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "maxWarrantiesPerMonth" INTEGER NOT NULL DEFAULT 50,
    "maxEmployees" INTEGER NOT NULL DEFAULT 5,
    "maxTemplates" INTEGER NOT NULL DEFAULT 5,
    "maxStorageMb" INTEGER NOT NULL DEFAULT 1000,
    "claimManagementAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessPlanEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarrantyTemplate_businessId_status_idx" ON "WarrantyTemplate"("businessId", "status");

-- CreateIndex
CREATE INDEX "WarrantyTemplate_deletedAt_idx" ON "WarrantyTemplate"("deletedAt");

-- CreateIndex
CREATE INDEX "WarrantyTemplateVersion_templateId_idx" ON "WarrantyTemplateVersion"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "WarrantyTemplateVersion_templateId_version_key" ON "WarrantyTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PendingWarrantyRecipient_invitationTokenHash_key" ON "PendingWarrantyRecipient"("invitationTokenHash");

-- CreateIndex
CREATE INDEX "PendingWarrantyRecipient_email_claimedAt_idx" ON "PendingWarrantyRecipient"("email", "claimedAt");

-- CreateIndex
CREATE INDEX "PendingWarrantyRecipient_expiresAt_idx" ON "PendingWarrantyRecipient"("expiresAt");

-- CreateIndex
CREATE INDEX "WarrantyRevision_warrantyId_revisionNumber_idx" ON "WarrantyRevision"("warrantyId", "revisionNumber");

-- CreateIndex
CREATE INDEX "WarrantyRevision_correctedByUserId_idx" ON "WarrantyRevision"("correctedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimAttachment_storageKey_key" ON "ClaimAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "ClaimAttachment_claimId_idx" ON "ClaimAttachment"("claimId");

-- CreateIndex
CREATE INDEX "ClaimAttachment_messageId_idx" ON "ClaimAttachment"("messageId");

-- CreateIndex
CREATE INDEX "ClaimMessage_claimId_isInternalNote_createdAt_idx" ON "ClaimMessage"("claimId", "isInternalNote", "createdAt");

-- CreateIndex
CREATE INDEX "ClaimMessage_senderUserId_idx" ON "ClaimMessage"("senderUserId");

-- CreateIndex
CREATE INDEX "ClaimAssignmentHistory_claimId_createdAt_idx" ON "ClaimAssignmentHistory"("claimId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPlanEntitlement_planId_key" ON "BusinessPlanEntitlement"("planId");

-- CreateIndex
CREATE INDEX "CatalogProduct_status_idx" ON "CatalogProduct"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Warranty_idempotencyKey_key" ON "Warranty"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Warranty_catalogProductId_idx" ON "Warranty"("catalogProductId");

-- CreateIndex
CREATE INDEX "Warranty_templateId_idx" ON "Warranty"("templateId");

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WarrantyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyTemplate" ADD CONSTRAINT "WarrantyTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyTemplate" ADD CONSTRAINT "WarrantyTemplate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyTemplate" ADD CONSTRAINT "WarrantyTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyTemplateVersion" ADD CONSTRAINT "WarrantyTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WarrantyTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingWarrantyRecipient" ADD CONSTRAINT "PendingWarrantyRecipient_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyRevision" ADD CONSTRAINT "WarrantyRevision_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyRevision" ADD CONSTRAINT "WarrantyRevision_correctedByUserId_fkey" FOREIGN KEY ("correctedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimAttachment" ADD CONSTRAINT "ClaimAttachment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "WarrantyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimAttachment" ADD CONSTRAINT "ClaimAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ClaimMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimAttachment" ADD CONSTRAINT "ClaimAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimMessage" ADD CONSTRAINT "ClaimMessage_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "WarrantyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimMessage" ADD CONSTRAINT "ClaimMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimAssignmentHistory" ADD CONSTRAINT "ClaimAssignmentHistory_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "WarrantyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimAssignmentHistory" ADD CONSTRAINT "ClaimAssignmentHistory_previousAssigneeMemberId_fkey" FOREIGN KEY ("previousAssigneeMemberId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimAssignmentHistory" ADD CONSTRAINT "ClaimAssignmentHistory_newAssigneeMemberId_fkey" FOREIGN KEY ("newAssigneeMemberId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimAssignmentHistory" ADD CONSTRAINT "ClaimAssignmentHistory_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPlanEntitlement" ADD CONSTRAINT "BusinessPlanEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

