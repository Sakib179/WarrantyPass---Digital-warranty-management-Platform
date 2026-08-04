-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "VerificationRevisionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "VerificationDocumentKind" AS ENUM ('TRADE_LICENSE', 'BIN', 'SUPPORTING');

-- CreateEnum
CREATE TYPE "FileScanStatus" AS ENUM ('UPLOADED', 'PENDING_SCAN', 'SAFE', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "PlatformRoleStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BusinessStatus" ADD VALUE 'DRAFT';
ALTER TYPE "BusinessStatus" ADD VALUE 'PENDING';
ALTER TYPE "BusinessStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "BusinessStatus" ADD VALUE 'MORE_INFORMATION_REQUIRED';
ALTER TYPE "BusinessStatus" ADD VALUE 'DEACTIVATED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VerificationStatus" ADD VALUE 'DRAFT';
ALTER TYPE "VerificationStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "VerificationStatus" ADD VALUE 'MORE_INFORMATION_REQUIRED';
ALTER TYPE "VerificationStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "VerificationStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "VerificationStatus" ADD VALUE 'DEACTIVATED';

-- DropIndex
DROP INDEX "Business_registrationType_registrationNumber_key";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "addressLine" VARCHAR(220),
ADD COLUMN     "area" VARCHAR(120),
ADD COLUMN     "binNumber" VARCHAR(80),
ADD COLUMN     "binNumberNormalized" VARCHAR(80),
ADD COLUMN     "businessType" VARCHAR(80),
ADD COLUMN     "district" VARCHAR(80),
ADD COLUMN     "division" VARCHAR(80),
ADD COLUMN     "duplicateIdentifierFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legalName" VARCHAR(180),
ADD COLUMN     "phone" VARCHAR(32),
ADD COLUMN     "postalCode" VARCHAR(20),
ADD COLUMN     "registrationNumberNormalized" VARCHAR(80),
ADD COLUMN     "statusVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "verificationReference" VARCHAR(40),
ADD COLUMN     "verifiedByUserId" UUID,
ADD COLUMN     "website" VARCHAR(300),
ADD COLUMN     "yearEstablished" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "BusinessMember" ADD COLUMN     "invitedByUserId" UUID,
ADD COLUMN     "lastActiveAt" TIMESTAMPTZ(3),
ADD COLUMN     "removedAt" TIMESTAMPTZ(3),
ADD COLUMN     "suspendedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "BusinessVerification" ADD COLUMN     "claimedAt" TIMESTAMPTZ(3),
ADD COLUMN     "claimedByUserId" UUID,
ADD COLUMN     "referenceNumber" VARCHAR(40),
ADD COLUMN     "rejectionCategory" VARCHAR(80),
ADD COLUMN     "userVisibleReason" TEXT,
ALTER COLUMN "documentStorageKey" DROP NOT NULL,
ALTER COLUMN "documentKind" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "deletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "isProtected" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "deviceName" VARCHAR(160),
ADD COLUMN     "ipAddress" INET,
ADD COLUMN     "rememberMe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reuseDetectedAt" TIMESTAMPTZ(3),
ADD COLUMN     "revokedReason" VARCHAR(120),
ADD COLUMN     "userAgent" VARCHAR(500);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActiveBusinessId" UUID,
ADD COLUMN     "lockedUntil" TIMESTAMPTZ(3),
ADD COLUMN     "passwordChangedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "MemberRole" (
    "memberId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberRole_pkey" PRIMARY KEY ("memberId","roleId")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "invalidatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "invalidatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailChangeToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "newEmail" VARCHAR(254) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "invalidatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "emailHash" CHAR(64) NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "failureReason" VARCHAR(80),
    "requestId" VARCHAR(80),
    "ipAddress" INET,
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermsAcceptance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "termsVersion" VARCHAR(40) NOT NULL,
    "privacyVersion" VARCHAR(40) NOT NULL,
    "termsAcceptedAt" TIMESTAMPTZ(3) NOT NULL,
    "privacyAcceptedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" INET,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessVerificationRevision" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "submittedByUserId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "VerificationRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerFullName" VARCHAR(120) NOT NULL,
    "legalName" VARCHAR(180) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "businessType" VARCHAR(80) NOT NULL,
    "tradeLicenseNumber" VARCHAR(80) NOT NULL,
    "tradeLicenseNumberNormalized" VARCHAR(80) NOT NULL,
    "binNumber" VARCHAR(80),
    "binNumberNormalized" VARCHAR(80),
    "yearEstablished" INTEGER,
    "phone" VARCHAR(32) NOT NULL,
    "businessEmail" VARCHAR(254) NOT NULL,
    "website" VARCHAR(300),
    "addressLine" VARCHAR(220) NOT NULL,
    "area" VARCHAR(120) NOT NULL,
    "district" VARCHAR(80) NOT NULL,
    "division" VARCHAR(80) NOT NULL,
    "postalCode" VARCHAR(20),
    "submittedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessVerificationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessVerificationDocument" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "kind" "VerificationDocumentKind" NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" CHAR(64) NOT NULL,
    "scanStatus" "FileScanStatus" NOT NULL DEFAULT 'PENDING_SCAN',
    "scannedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessVerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessVerificationStatusHistory" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "previousStatus" "BusinessStatus",
    "newStatus" "BusinessStatus" NOT NULL,
    "reviewerId" UUID,
    "internalNote" TEXT,
    "userVisibleReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessVerificationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessInvitation" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "invitedByUserId" UUID NOT NULL,
    "acceptedByUserId" UUID,
    "email" VARCHAR(254) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "personalMessage" VARCHAR(500),
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPermission" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlatformPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRole" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "isProtected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserPlatformRole" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "status" "PlatformRoleStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserPlatformRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "SessionRefreshToken" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "replacedByHash" CHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberRole_roleId_idx" ON "MemberRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_consumedAt_idx" ON "EmailVerificationToken"("expiresAt", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_consumedAt_idx" ON "PasswordResetToken"("expiresAt", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeToken_tokenHash_key" ON "EmailChangeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailChangeToken_userId_expiresAt_idx" ON "EmailChangeToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailChangeToken_newEmail_idx" ON "EmailChangeToken"("newEmail");

-- CreateIndex
CREATE INDEX "LoginAttempt_emailHash_createdAt_idx" ON "LoginAttempt"("emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_userId_createdAt_idx" ON "LoginAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_createdAt_idx" ON "LoginAttempt"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "TermsAcceptance_userId_createdAt_idx" ON "TermsAcceptance"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessVerificationRevision_businessId_status_idx" ON "BusinessVerificationRevision"("businessId", "status");

-- CreateIndex
CREATE INDEX "BusinessVerificationRevision_submittedByUserId_idx" ON "BusinessVerificationRevision"("submittedByUserId");

-- CreateIndex
CREATE INDEX "BusinessVerificationRevision_tradeLicenseNumberNormalized_idx" ON "BusinessVerificationRevision"("tradeLicenseNumberNormalized");

-- CreateIndex
CREATE INDEX "BusinessVerificationRevision_binNumberNormalized_idx" ON "BusinessVerificationRevision"("binNumberNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessVerificationRevision_businessId_version_key" ON "BusinessVerificationRevision"("businessId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessVerificationDocument_storageKey_key" ON "BusinessVerificationDocument"("storageKey");

-- CreateIndex
CREATE INDEX "BusinessVerificationDocument_businessId_kind_idx" ON "BusinessVerificationDocument"("businessId", "kind");

-- CreateIndex
CREATE INDEX "BusinessVerificationDocument_revisionId_deletedAt_idx" ON "BusinessVerificationDocument"("revisionId", "deletedAt");

-- CreateIndex
CREATE INDEX "BusinessVerificationDocument_scanStatus_idx" ON "BusinessVerificationDocument"("scanStatus");

-- CreateIndex
CREATE INDEX "BusinessVerificationStatusHistory_businessId_createdAt_idx" ON "BusinessVerificationStatusHistory"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessVerificationStatusHistory_newStatus_createdAt_idx" ON "BusinessVerificationStatusHistory"("newStatus", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessVerificationStatusHistory_reviewerId_idx" ON "BusinessVerificationStatusHistory"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvitation_tokenHash_key" ON "BusinessInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "BusinessInvitation_businessId_status_createdAt_idx" ON "BusinessInvitation"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessInvitation_email_status_idx" ON "BusinessInvitation"("email", "status");

-- CreateIndex
CREATE INDEX "BusinessInvitation_roleId_idx" ON "BusinessInvitation"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPermission_key_key" ON "PlatformPermission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRole_key_key" ON "PlatformRole"("key");

-- CreateIndex
CREATE INDEX "PlatformRolePermission_permissionId_idx" ON "PlatformRolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "UserPlatformRole_roleId_status_idx" ON "UserPlatformRole"("roleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SessionRefreshToken_tokenHash_key" ON "SessionRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SessionRefreshToken_sessionId_createdAt_idx" ON "SessionRefreshToken"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SessionRefreshToken_expiresAt_idx" ON "SessionRefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Business_verificationReference_key" ON "Business"("verificationReference");

-- CreateIndex
CREATE INDEX "Business_registrationType_registrationNumber_idx" ON "Business"("registrationType", "registrationNumber");

-- CreateIndex
CREATE INDEX "Business_registrationNumberNormalized_idx" ON "Business"("registrationNumberNormalized");

-- CreateIndex
CREATE INDEX "Business_binNumberNormalized_idx" ON "Business"("binNumberNormalized");

-- CreateIndex
CREATE INDEX "Business_status_updatedAt_idx" ON "Business"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Business_verifiedByUserId_idx" ON "Business"("verifiedByUserId");

-- CreateIndex
CREATE INDEX "BusinessMember_invitedByUserId_idx" ON "BusinessMember"("invitedByUserId");

-- CreateIndex
CREATE INDEX "BusinessMember_businessId_status_idx" ON "BusinessMember"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessVerification_referenceNumber_key" ON "BusinessVerification"("referenceNumber");

-- CreateIndex
CREATE INDEX "BusinessVerification_claimedByUserId_idx" ON "BusinessVerification"("claimedByUserId");

-- CreateIndex
CREATE INDEX "BusinessVerification_status_submittedAt_idx" ON "BusinessVerification"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Role_deletedAt_idx" ON "Role"("deletedAt");

-- CreateIndex
CREATE INDEX "Session_lastUsedAt_idx" ON "Session"("lastUsedAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_lockedUntil_idx" ON "User"("lockedUntil");

-- CreateIndex
CREATE INDEX "User_lastActiveBusinessId_idx" ON "User"("lastActiveBusinessId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastActiveBusinessId_fkey" FOREIGN KEY ("lastActiveBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerification" ADD CONSTRAINT "BusinessVerification_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "BusinessMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailChangeToken" ADD CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerificationRevision" ADD CONSTRAINT "BusinessVerificationRevision_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerificationRevision" ADD CONSTRAINT "BusinessVerificationRevision_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerificationDocument" ADD CONSTRAINT "BusinessVerificationDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerificationDocument" ADD CONSTRAINT "BusinessVerificationDocument_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "BusinessVerificationRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerificationDocument" ADD CONSTRAINT "BusinessVerificationDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerificationStatusHistory" ADD CONSTRAINT "BusinessVerificationStatusHistory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerificationStatusHistory" ADD CONSTRAINT "BusinessVerificationStatusHistory_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "PlatformPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlatformRole" ADD CONSTRAINT "UserPlatformRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlatformRole" ADD CONSTRAINT "UserPlatformRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRefreshToken" ADD CONSTRAINT "SessionRefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing Part 1 membership assignments in the new many-to-many role model.
INSERT INTO "MemberRole" ("memberId", "roleId", "createdAt")
SELECT "id", "roleId", CURRENT_TIMESTAMP
FROM "BusinessMember"
ON CONFLICT ("memberId", "roleId") DO NOTHING;

-- Normalize the legacy Part 1 queue status without removing its enum value.
UPDATE "Business"
SET "status" = 'PENDING',
    "registrationNumberNormalized" = UPPER(REGEXP_REPLACE("registrationNumber", '[^A-Za-z0-9]', '', 'g'))
WHERE "status" = 'PENDING_VERIFICATION';

UPDATE "Business"
SET "registrationNumberNormalized" = UPPER(REGEXP_REPLACE("registrationNumber", '[^A-Za-z0-9]', '', 'g'))
WHERE "registrationNumberNormalized" IS NULL;

-- Case-insensitive identity and invitation safeguards.
CREATE UNIQUE INDEX "User_email_normalized_key" ON "User" (LOWER("email"));
CREATE INDEX "BusinessInvitation_email_normalized_status_idx"
ON "BusinessInvitation" (LOWER("email"), "status");
CREATE UNIQUE INDEX "BusinessInvitation_one_pending_per_business_email_key"
ON "BusinessInvitation" ("businessId", LOWER("email"))
WHERE "status" = 'PENDING';

-- Additional domain constraints not expressible in Prisma's schema language.
ALTER TABLE "Business"
ADD CONSTRAINT "Business_status_version_positive_check" CHECK ("statusVersion" > 0),
ADD CONSTRAINT "Business_year_established_check"
  CHECK ("yearEstablished" IS NULL OR ("yearEstablished" BETWEEN 1800 AND 2200));

ALTER TABLE "BusinessVerificationRevision"
ADD CONSTRAINT "BusinessVerificationRevision_version_positive_check" CHECK ("version" > 0),
ADD CONSTRAINT "BusinessVerificationRevision_year_established_check"
  CHECK ("yearEstablished" IS NULL OR ("yearEstablished" BETWEEN 1800 AND 2200));

ALTER TABLE "BusinessVerificationDocument"
ADD CONSTRAINT "BusinessVerificationDocument_positive_size_check" CHECK ("sizeBytes" > 0);

ALTER TABLE "Session"
ADD CONSTRAINT "Session_expiry_after_creation_check" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "EmailVerificationToken"
ADD CONSTRAINT "EmailVerificationToken_expiry_after_creation_check" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "PasswordResetToken"
ADD CONSTRAINT "PasswordResetToken_expiry_after_creation_check" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "BusinessInvitation"
ADD CONSTRAINT "BusinessInvitation_expiry_after_creation_check" CHECK ("expiresAt" > "createdAt");
