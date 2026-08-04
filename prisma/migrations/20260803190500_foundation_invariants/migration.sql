-- Domain invariants that cannot be represented directly in the Prisma schema.

ALTER TABLE "Product"
ADD CONSTRAINT "Product_exactly_one_catalog_owner_check"
CHECK (("businessId" IS NOT NULL) <> ("ownerUserId" IS NOT NULL));

ALTER TABLE "Warranty"
ADD CONSTRAINT "Warranty_source_and_provenance_check"
CHECK (
  (
    "source" = 'BUSINESS_ISSUED'
    AND "issuerBusinessId" IS NOT NULL
    AND "verificationLabel" <> 'USER_UPLOADED'
    AND "verificationLabel" <> 'VERIFICATION_PENDING'
  )
  OR
  (
    "source" = 'USER_UPLOADED'
    AND "issuerBusinessId" IS NULL
    AND "verificationCode" IS NULL
    AND "verificationLabel" <> 'VERIFIED_BY_BUSINESS'
    AND "verificationLabel" <> 'REVOKED'
  )
);

ALTER TABLE "Warranty"
ADD CONSTRAINT "Warranty_expiry_after_issue_check"
CHECK ("expiresAt" IS NULL OR "expiresAt" >= "issueDate");

ALTER TABLE "WarrantyDocument"
ADD CONSTRAINT "WarrantyDocument_positive_size_check"
CHECK ("sizeBytes" > 0);

ALTER TABLE "Subscription"
ADD CONSTRAINT "Subscription_owner_matches_type_check"
CHECK (
  (
    "ownerType" = 'USER'
    AND "userId" IS NOT NULL
    AND "businessId" IS NULL
  )
  OR
  (
    "ownerType" = 'BUSINESS'
    AND "businessId" IS NOT NULL
    AND "userId" IS NULL
  )
);

ALTER TABLE "Business"
ADD CONSTRAINT "Business_verified_timestamp_check"
CHECK ("status" <> 'VERIFIED' OR "verifiedAt" IS NOT NULL);
