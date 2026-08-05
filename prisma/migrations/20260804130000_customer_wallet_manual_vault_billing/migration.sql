-- This is a forward-only migration. Existing payment rows receive deterministic,
-- non-secret legacy references before the new columns become required.
-- CreateEnum
CREATE TYPE "CustomerProductSource" AS ENUM ('BUSINESS_ISSUED', 'USER_UPLOADED', 'PLATFORM_IMPORTED');

-- CreateEnum
CREATE TYPE "ProductOwnershipStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "WarrantyDurationUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS');

-- CreateEnum
CREATE TYPE "WarrantyCoverageType" AS ENUM ('MANUFACTURER', 'SELLER', 'LIMITED', 'EXTENDED', 'SERVICE_ONLY', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CONFIRMED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'SUSPENDED';

-- AlterEnum
ALTER TYPE "WarrantySource" ADD VALUE 'PLATFORM_IMPORTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WarrantyStatus" ADD VALUE 'NOT_STARTED';
ALTER TYPE "WarrantyStatus" ADD VALUE 'EXPIRING_SOON';
ALTER TYPE "WarrantyStatus" ADD VALUE 'VOIDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WarrantyVerificationLabel" ADD VALUE 'UNVERIFIED';
ALTER TYPE "WarrantyVerificationLabel" ADD VALUE 'REJECTED';

-- DropForeignKey
ALTER TABLE "Warranty" DROP CONSTRAINT "Warranty_productId_fkey";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" VARCHAR(180),
ADD COLUMN "paymentReference" VARCHAR(120);

UPDATE "Payment"
SET
  "idempotencyKey" = 'legacy:' || "id"::text,
  "paymentReference" = 'LEGACY-' || "id"::text
WHERE "idempotencyKey" IS NULL OR "paymentReference" IS NULL;

ALTER TABLE "Payment"
ALTER COLUMN "idempotencyKey" SET NOT NULL,
ALTER COLUMN "paymentReference" SET NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planId" UUID;

-- AlterTable
ALTER TABLE "Warranty" ADD COLUMN     "coverageType" "WarrantyCoverageType",
ADD COLUMN     "customerProductId" UUID,
ADD COLUMN     "durationUnit" "WarrantyDurationUnit",
ADD COLUMN     "durationValue" INTEGER,
ADD COLUMN     "endDate" DATE,
ADD COLUMN     "startDate" DATE,
ADD COLUMN     "warrantyNumber" VARCHAR(120),
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WarrantyDocument" ADD COLUMN     "scanStatus" "FileScanStatus" NOT NULL DEFAULT 'UPLOADED',
ADD COLUMN     "uploadedByUserId" UUID;

-- Domain invariants that Prisma cannot express directly.
ALTER TABLE "Warranty"
ADD CONSTRAINT "Warranty_product_reference_check"
CHECK ("productId" IS NOT NULL OR "customerProductId" IS NOT NULL),
ADD CONSTRAINT "Warranty_date_order_check"
CHECK ("startDate" IS NULL OR "endDate" IS NULL OR "endDate" >= "startDate"),
ADD CONSTRAINT "Warranty_duration_positive_check"
CHECK ("durationValue" IS NULL OR "durationValue" > 0);

-- CreateTable
CREATE TABLE "ProductBrand" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ProductBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" UUID NOT NULL,
    "parentId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" UUID NOT NULL,
    "businessId" UUID,
    "brandId" UUID,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "modelNumber" VARCHAR(120),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProduct" (
    "id" UUID NOT NULL,
    "customerUserId" UUID NOT NULL,
    "catalogProductId" UUID,
    "brandId" UUID,
    "categoryId" UUID NOT NULL,
    "productName" VARCHAR(180) NOT NULL,
    "modelNumber" VARCHAR(120),
    "serialNumber" VARCHAR(180),
    "purchaseDate" DATE NOT NULL,
    "sellerName" VARCHAR(180) NOT NULL,
    "nickname" VARCHAR(120),
    "notes" TEXT,
    "sourceType" "CustomerProductSource" NOT NULL,
    "ownershipStatus" "ProductOwnershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CustomerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BDT',
    "interval" "BillingInterval" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(60) NOT NULL,
    "providerEventId" VARCHAR(180) NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "status" "BillingEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "payloadHash" CHAR(64) NOT NULL,
    "processedAt" TIMESTAMPTZ(3),
    "failureCode" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentExtractionJob" (
    "id" UUID NOT NULL,
    "customerUserId" UUID NOT NULL,
    "provider" VARCHAR(60) NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "sourceMimeType" VARCHAR(100) NOT NULL,
    "sourceHash" CHAR(64) NOT NULL,
    "extractedFields" JSONB,
    "confirmedFields" JSONB,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DocumentExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductBrand_slug_key" ON "ProductBrand"("slug");

-- CreateIndex
CREATE INDEX "ProductBrand_name_idx" ON "ProductBrand"("name");

-- CreateIndex
CREATE INDEX "ProductBrand_isActive_name_idx" ON "ProductBrand"("isActive", "name");

-- CreateIndex
CREATE INDEX "ProductBrand_deletedAt_idx" ON "ProductBrand"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE INDEX "ProductCategory_parentId_name_idx" ON "ProductCategory"("parentId", "name");

-- CreateIndex
CREATE INDEX "ProductCategory_isActive_name_idx" ON "ProductCategory"("isActive", "name");

-- CreateIndex
CREATE INDEX "ProductCategory_deletedAt_idx" ON "ProductCategory"("deletedAt");

-- CreateIndex
CREATE INDEX "CatalogProduct_brandId_name_idx" ON "CatalogProduct"("brandId", "name");

-- CreateIndex
CREATE INDEX "CatalogProduct_categoryId_name_idx" ON "CatalogProduct"("categoryId", "name");

-- CreateIndex
CREATE INDEX "CatalogProduct_isActive_idx" ON "CatalogProduct"("isActive");

-- CreateIndex
CREATE INDEX "CatalogProduct_deletedAt_idx" ON "CatalogProduct"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_businessId_modelNumber_key" ON "CatalogProduct"("businessId", "modelNumber");

-- CreateIndex
CREATE INDEX "CustomerProduct_customerUserId_ownershipStatus_createdAt_idx" ON "CustomerProduct"("customerUserId", "ownershipStatus", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerProduct_customerUserId_productName_idx" ON "CustomerProduct"("customerUserId", "productName");

-- CreateIndex
CREATE INDEX "CustomerProduct_brandId_idx" ON "CustomerProduct"("brandId");

-- CreateIndex
CREATE INDEX "CustomerProduct_categoryId_idx" ON "CustomerProduct"("categoryId");

-- CreateIndex
CREATE INDEX "CustomerProduct_catalogProductId_idx" ON "CustomerProduct"("catalogProductId");

-- CreateIndex
CREATE INDEX "CustomerProduct_serialNumber_idx" ON "CustomerProduct"("serialNumber");

-- CreateIndex
CREATE INDEX "CustomerProduct_deletedAt_idx" ON "CustomerProduct"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_key_key" ON "SubscriptionPlan"("key");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_interval_idx" ON "SubscriptionPlan"("isActive", "interval");

-- CreateIndex
CREATE INDEX "BillingEvent_status_createdAt_idx" ON "BillingEvent"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_provider_providerEventId_key" ON "BillingEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "DocumentExtractionJob_customerUserId_createdAt_idx" ON "DocumentExtractionJob"("customerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentExtractionJob_status_expiresAt_idx" ON "DocumentExtractionJob"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentReference_key" ON "Payment"("paymentReference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Warranty_customerProductId_idx" ON "Warranty"("customerProductId");

-- CreateIndex
CREATE INDEX "Warranty_customerUserId_verificationLabel_idx" ON "Warranty"("customerUserId", "verificationLabel");

-- CreateIndex
CREATE INDEX "Warranty_customerUserId_source_createdAt_idx" ON "Warranty"("customerUserId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "Warranty_warrantyNumber_idx" ON "Warranty"("warrantyNumber");

-- CreateIndex
CREATE INDEX "Warranty_endDate_idx" ON "Warranty"("endDate");

-- CreateIndex
CREATE INDEX "WarrantyDocument_uploadedByUserId_idx" ON "WarrantyDocument"("uploadedByUserId");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ProductBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProduct" ADD CONSTRAINT "CustomerProduct_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProduct" ADD CONSTRAINT "CustomerProduct_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProduct" ADD CONSTRAINT "CustomerProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ProductBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProduct" ADD CONSTRAINT "CustomerProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_customerProductId_fkey" FOREIGN KEY ("customerProductId") REFERENCES "CustomerProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyDocument" ADD CONSTRAINT "WarrantyDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentExtractionJob" ADD CONSTRAINT "DocumentExtractionJob_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
