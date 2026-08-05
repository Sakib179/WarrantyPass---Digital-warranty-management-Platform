-- DropEnum
DROP TYPE "RepairStatus_new";

-- CreateTable
CREATE TABLE "ServiceCenter" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "serviceCenterCode" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "email" VARCHAR(254),
    "addressLine" VARCHAR(255) NOT NULL,
    "area" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "division" VARCHAR(100) NOT NULL,
    "postalCode" VARCHAR(20),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "openingHours" TEXT NOT NULL,
    "serviceInstructions" TEXT,
    "status" "ServiceCenterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ServiceCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCenterMember" (
    "id" UUID NOT NULL,
    "serviceCenterId" UUID NOT NULL,
    "businessMemberId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCenterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCenterCategory" (
    "serviceCenterId" UUID NOT NULL,
    "productCategoryId" UUID NOT NULL,

    CONSTRAINT "ServiceCenterCategory_pkey" PRIMARY KEY ("serviceCenterId","productCategoryId")
);

-- CreateTable
CREATE TABLE "ServiceCenterBrand" (
    "serviceCenterId" UUID NOT NULL,
    "productBrandId" UUID NOT NULL,

    CONSTRAINT "ServiceCenterBrand_pkey" PRIMARY KEY ("serviceCenterId","productBrandId")
);

-- CreateTable
CREATE TABLE "ClaimServiceCenterAssignment" (
    "id" UUID NOT NULL,
    "claimId" UUID NOT NULL,
    "serviceCenterId" UUID NOT NULL,
    "assignedByUserId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMPTZ(3),
    "assignmentReason" TEXT,

    CONSTRAINT "ClaimServiceCenterAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAppointment" (
    "id" UUID NOT NULL,
    "claimId" UUID NOT NULL,
    "customerUserId" UUID NOT NULL,
    "serviceCenterId" UUID NOT NULL,
    "requestedDate" DATE NOT NULL,
    "requestedTimeWindow" VARCHAR(60) NOT NULL,
    "confirmedDate" DATE,
    "confirmedTimeWindow" VARCHAR(60),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "customerNote" TEXT,
    "businessNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ServiceAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairRecord" (
    "id" UUID NOT NULL,
    "repairNumber" VARCHAR(60) NOT NULL,
    "customerProductId" UUID NOT NULL,
    "warrantyId" UUID,
    "claimId" UUID,
    "businessId" UUID NOT NULL,
    "serviceCenterId" UUID NOT NULL,
    "technicianMemberId" UUID,
    "reportedProblem" TEXT NOT NULL,
    "diagnosis" TEXT,
    "workPerformed" TEXT,
    "partsReplaced" TEXT,
    "warrantyCoverageStatus" "RepairCoverageStatus" NOT NULL DEFAULT 'PENDING_DECISION',
    "laborCostCents" INTEGER NOT NULL DEFAULT 0,
    "partsCostCents" INTEGER NOT NULL DEFAULT 0,
    "totalCostCents" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMPTZ(3),
    "repairStartedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),
    "currentStatus" "RepairStatus" NOT NULL DEFAULT 'CREATED',
    "customerVisibleNote" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RepairRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairStatusHistory" (
    "id" UUID NOT NULL,
    "repairId" UUID NOT NULL,
    "fromStatus" "RepairStatus",
    "toStatus" "RepairStatus" NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "customerVisibleNote" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairDocument" (
    "id" UUID NOT NULL,
    "repairId" UUID NOT NULL,
    "storageKey" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isCustomerVisible" BOOLEAN NOT NULL DEFAULT true,
    "uploadedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairAssignmentHistory" (
    "id" UUID NOT NULL,
    "repairId" UUID NOT NULL,
    "previousTechnicianId" UUID,
    "newTechnicianId" UUID,
    "assignedByUserId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessTransferPolicy" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "isTransferAllowed" BOOLEAN NOT NULL DEFAULT true,
    "requireBusinessApproval" BOOLEAN NOT NULL DEFAULT true,
    "maxTransfersPerWarranty" INTEGER NOT NULL DEFAULT 3,
    "minRemainingDaysRequired" INTEGER NOT NULL DEFAULT 30,
    "transferRepairHistoryAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessTransferPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipTransfer" (
    "id" UUID NOT NULL,
    "transferNumber" VARCHAR(60) NOT NULL,
    "customerProductId" UUID NOT NULL,
    "warrantyId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "recipientEmail" VARCHAR(254) NOT NULL,
    "recipientUserId" UUID,
    "invitationTokenHash" CHAR(64) NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING_RECIPIENT',
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "businessApprovedAt" TIMESTAMPTZ(3),
    "businessApprovedBy" UUID,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OwnershipTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipTransferHistory" (
    "id" UUID NOT NULL,
    "transferId" UUID NOT NULL,
    "fromStatus" "TransferStatus",
    "toStatus" "TransferStatus" NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnershipTransferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOwnershipHistory" (
    "id" UUID NOT NULL,
    "customerProductId" UUID NOT NULL,
    "previousOwnerId" UUID,
    "newOwnerId" UUID NOT NULL,
    "transferId" UUID,
    "transferredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductOwnershipHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyVerificationAttempt" (
    "id" UUID NOT NULL,
    "warrantyNumber" VARCHAR(60) NOT NULL,
    "serialNumber" VARCHAR(100),
    "verificationCode" VARCHAR(60),
    "ipAddress" INET,
    "userAgent" VARCHAR(500),
    "result" VARCHAR(40) NOT NULL,
    "matchedWarrantyId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarrantyVerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallNotice" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "publicReferenceNumber" VARCHAR(60) NOT NULL,
    "severity" "RecallSeverity" NOT NULL DEFAULT 'MEDIUM',
    "noticeType" "RecallNoticeType" NOT NULL DEFAULT 'SAFETY_WARNING',
    "description" TEXT NOT NULL,
    "customerInstructions" TEXT NOT NULL,
    "affectedBrandId" UUID,
    "affectedModelNumbers" VARCHAR(100)[],
    "affectedSerialNumberRanges" TEXT,
    "affectedPurchaseStart" DATE,
    "affectedPurchaseEnd" DATE,
    "publishedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "status" "RecallStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" UUID NOT NULL,
    "approvedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RecallNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallRecipient" (
    "id" UUID NOT NULL,
    "recallNoticeId" UUID NOT NULL,
    "customerUserId" UUID NOT NULL,
    "customerProductId" UUID NOT NULL,
    "notifiedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallAcknowledgement" (
    "id" UUID NOT NULL,
    "recallNoticeId" UUID NOT NULL,
    "customerUserId" UUID NOT NULL,
    "acknowledgedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "RecallAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceCenter_businessId_status_idx" ON "ServiceCenter"("businessId", "status");

-- CreateIndex
CREATE INDEX "ServiceCenter_division_district_area_idx" ON "ServiceCenter"("division", "district", "area");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCenter_businessId_serviceCenterCode_key" ON "ServiceCenter"("businessId", "serviceCenterCode");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCenterMember_serviceCenterId_businessMemberId_key" ON "ServiceCenterMember"("serviceCenterId", "businessMemberId");

-- CreateIndex
CREATE INDEX "ClaimServiceCenterAssignment_claimId_assignedAt_idx" ON "ClaimServiceCenterAssignment"("claimId", "assignedAt");

-- CreateIndex
CREATE INDEX "ServiceAppointment_claimId_idx" ON "ServiceAppointment"("claimId");

-- CreateIndex
CREATE INDEX "ServiceAppointment_customerUserId_idx" ON "ServiceAppointment"("customerUserId");

-- CreateIndex
CREATE INDEX "ServiceAppointment_serviceCenterId_requestedDate_idx" ON "ServiceAppointment"("serviceCenterId", "requestedDate");

-- CreateIndex
CREATE UNIQUE INDEX "RepairRecord_repairNumber_key" ON "RepairRecord"("repairNumber");

-- CreateIndex
CREATE INDEX "RepairRecord_businessId_currentStatus_idx" ON "RepairRecord"("businessId", "currentStatus");

-- CreateIndex
CREATE INDEX "RepairRecord_customerProductId_idx" ON "RepairRecord"("customerProductId");

-- CreateIndex
CREATE INDEX "RepairRecord_serviceCenterId_idx" ON "RepairRecord"("serviceCenterId");

-- CreateIndex
CREATE INDEX "RepairStatusHistory_repairId_createdAt_idx" ON "RepairStatusHistory"("repairId", "createdAt");

-- CreateIndex
CREATE INDEX "RepairDocument_repairId_idx" ON "RepairDocument"("repairId");

-- CreateIndex
CREATE INDEX "RepairAssignmentHistory_repairId_assignedAt_idx" ON "RepairAssignmentHistory"("repairId", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTransferPolicy_businessId_key" ON "BusinessTransferPolicy"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnershipTransfer_transferNumber_key" ON "OwnershipTransfer"("transferNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OwnershipTransfer_invitationTokenHash_key" ON "OwnershipTransfer"("invitationTokenHash");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_senderUserId_idx" ON "OwnershipTransfer"("senderUserId");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_recipientEmail_idx" ON "OwnershipTransfer"("recipientEmail");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_businessId_status_idx" ON "OwnershipTransfer"("businessId", "status");

-- CreateIndex
CREATE INDEX "OwnershipTransferHistory_transferId_createdAt_idx" ON "OwnershipTransferHistory"("transferId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductOwnershipHistory_customerProductId_transferredAt_idx" ON "ProductOwnershipHistory"("customerProductId", "transferredAt");

-- CreateIndex
CREATE INDEX "WarrantyVerificationAttempt_warrantyNumber_idx" ON "WarrantyVerificationAttempt"("warrantyNumber");

-- CreateIndex
CREATE INDEX "WarrantyVerificationAttempt_ipAddress_createdAt_idx" ON "WarrantyVerificationAttempt"("ipAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecallNotice_publicReferenceNumber_key" ON "RecallNotice"("publicReferenceNumber");

-- CreateIndex
CREATE INDEX "RecallNotice_businessId_status_idx" ON "RecallNotice"("businessId", "status");

-- CreateIndex
CREATE INDEX "RecallNotice_publicReferenceNumber_idx" ON "RecallNotice"("publicReferenceNumber");

-- CreateIndex
CREATE INDEX "RecallRecipient_customerUserId_idx" ON "RecallRecipient"("customerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RecallRecipient_recallNoticeId_customerUserId_customerProdu_key" ON "RecallRecipient"("recallNoticeId", "customerUserId", "customerProductId");

-- CreateIndex
CREATE INDEX "RecallAcknowledgement_customerUserId_idx" ON "RecallAcknowledgement"("customerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RecallAcknowledgement_recallNoticeId_customerUserId_key" ON "RecallAcknowledgement"("recallNoticeId", "customerUserId");

-- AddForeignKey
ALTER TABLE "ServiceCenter" ADD CONSTRAINT "ServiceCenter_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCenter" ADD CONSTRAINT "ServiceCenter_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCenterMember" ADD CONSTRAINT "ServiceCenterMember_serviceCenterId_fkey" FOREIGN KEY ("serviceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCenterMember" ADD CONSTRAINT "ServiceCenterMember_businessMemberId_fkey" FOREIGN KEY ("businessMemberId") REFERENCES "BusinessMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCenterCategory" ADD CONSTRAINT "ServiceCenterCategory_serviceCenterId_fkey" FOREIGN KEY ("serviceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCenterCategory" ADD CONSTRAINT "ServiceCenterCategory_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCenterBrand" ADD CONSTRAINT "ServiceCenterBrand_serviceCenterId_fkey" FOREIGN KEY ("serviceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCenterBrand" ADD CONSTRAINT "ServiceCenterBrand_productBrandId_fkey" FOREIGN KEY ("productBrandId") REFERENCES "ProductBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimServiceCenterAssignment" ADD CONSTRAINT "ClaimServiceCenterAssignment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "WarrantyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimServiceCenterAssignment" ADD CONSTRAINT "ClaimServiceCenterAssignment_serviceCenterId_fkey" FOREIGN KEY ("serviceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimServiceCenterAssignment" ADD CONSTRAINT "ClaimServiceCenterAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "WarrantyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_serviceCenterId_fkey" FOREIGN KEY ("serviceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRecord" ADD CONSTRAINT "RepairRecord_customerProductId_fkey" FOREIGN KEY ("customerProductId") REFERENCES "CustomerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRecord" ADD CONSTRAINT "RepairRecord_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRecord" ADD CONSTRAINT "RepairRecord_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "WarrantyClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRecord" ADD CONSTRAINT "RepairRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRecord" ADD CONSTRAINT "RepairRecord_serviceCenterId_fkey" FOREIGN KEY ("serviceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRecord" ADD CONSTRAINT "RepairRecord_technicianMemberId_fkey" FOREIGN KEY ("technicianMemberId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairStatusHistory" ADD CONSTRAINT "RepairStatusHistory_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "RepairRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairStatusHistory" ADD CONSTRAINT "RepairStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairDocument" ADD CONSTRAINT "RepairDocument_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "RepairRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairDocument" ADD CONSTRAINT "RepairDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairAssignmentHistory" ADD CONSTRAINT "RepairAssignmentHistory_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "RepairRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairAssignmentHistory" ADD CONSTRAINT "RepairAssignmentHistory_previousTechnicianId_fkey" FOREIGN KEY ("previousTechnicianId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairAssignmentHistory" ADD CONSTRAINT "RepairAssignmentHistory_newTechnicianId_fkey" FOREIGN KEY ("newTechnicianId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairAssignmentHistory" ADD CONSTRAINT "RepairAssignmentHistory_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTransferPolicy" ADD CONSTRAINT "BusinessTransferPolicy_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_customerProductId_fkey" FOREIGN KEY ("customerProductId") REFERENCES "CustomerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_businessApprovedBy_fkey" FOREIGN KEY ("businessApprovedBy") REFERENCES "BusinessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransferHistory" ADD CONSTRAINT "OwnershipTransferHistory_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "OwnershipTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransferHistory" ADD CONSTRAINT "OwnershipTransferHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOwnershipHistory" ADD CONSTRAINT "ProductOwnershipHistory_customerProductId_fkey" FOREIGN KEY ("customerProductId") REFERENCES "CustomerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOwnershipHistory" ADD CONSTRAINT "ProductOwnershipHistory_previousOwnerId_fkey" FOREIGN KEY ("previousOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOwnershipHistory" ADD CONSTRAINT "ProductOwnershipHistory_newOwnerId_fkey" FOREIGN KEY ("newOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOwnershipHistory" ADD CONSTRAINT "ProductOwnershipHistory_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "OwnershipTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallNotice" ADD CONSTRAINT "RecallNotice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallNotice" ADD CONSTRAINT "RecallNotice_affectedBrandId_fkey" FOREIGN KEY ("affectedBrandId") REFERENCES "ProductBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallNotice" ADD CONSTRAINT "RecallNotice_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallNotice" ADD CONSTRAINT "RecallNotice_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallRecipient" ADD CONSTRAINT "RecallRecipient_recallNoticeId_fkey" FOREIGN KEY ("recallNoticeId") REFERENCES "RecallNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallRecipient" ADD CONSTRAINT "RecallRecipient_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallRecipient" ADD CONSTRAINT "RecallRecipient_customerProductId_fkey" FOREIGN KEY ("customerProductId") REFERENCES "CustomerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAcknowledgement" ADD CONSTRAINT "RecallAcknowledgement_recallNoticeId_fkey" FOREIGN KEY ("recallNoticeId") REFERENCES "RecallNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAcknowledgement" ADD CONSTRAINT "RecallAcknowledgement_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

