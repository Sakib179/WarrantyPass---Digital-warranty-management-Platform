# Database design

## Customer warranty additions

`ProductBrand`, `ProductCategory`, `CatalogProduct`, and `CustomerProduct` normalize the customer
wallet. `Warranty` keeps its legacy relation while adding the new aggregate relation. Database checks
require one product relation, ordered dates, and positive duration values.

`SubscriptionPlan` normalizes plan configuration. The forward migration backfills deterministic
references for existing payments before applying required/unique constraints. `BillingEvent` and
`DocumentExtractionJob` persist idempotency and review state without storing file binaries.

## Identity, RBAC, and verification additions

Identity includes hashed email/reset/change tokens, terms acceptance, login attempts, session
metadata, and refresh-token records with rotation ancestry.

Business access uses `BusinessMember -> MemberRole -> Role -> RolePermission -> Permission`.
Platform access uses separate role and permission tables. Verification uses explicit status,
immutable revisions, documents, review records, and history. Identifiers remain typed columns.

The migration is additive and backfills memberships and legacy pending statuses without recreating
or resetting Part 1 tables.

## Conventions

- PostgreSQL is the system of record.
- All primary identifiers are UUIDs.
- Mutable domain records use `createdAt` and `updatedAt` with timezone-aware timestamps.
- Recoverable identities and business records use `deletedAt`; queries must explicitly exclude deleted
  rows until a reusable soft-delete policy is added.
- Indexed fields reflect expected list, lookup, expiry, and operational queue access.
- Structured, queryable attributes use columns and enums. JSON is limited to redacted audit metadata,
  whose shape varies by event and is validated by the application before persistence.
- Monetary amounts use `Decimal(12,2)` and an explicit ISO currency code, defaulting to BDT.
- File tables store provider object keys, metadata, and checksums—not binary content.

## Identity and organizations

- `User` represents a customer or platform administrator. Business responsibility is never encoded as a
  global user kind.
- `UserProfile` stores customer-facing profile and locale preferences separately from credentials.
- `Business` stores the legal identity and current platform status.
- `BusinessVerification` preserves each review submission and reviewer decision.
- `BusinessMember` connects any user to multiple businesses.
- `Role`, `Permission`, and `RolePermission` implement per-business, extensible RBAC. System roles are
  templates; later custom roles can be scoped with `businessId`.
- `Session` stores only a refresh-token hash and rotation family, ready for Part 2.

## Warranty domain

- `Product` may belong to a connected business catalogue or to a customer-created manual record.
- `Warranty` has a required customer and product, optional verified issuer, explicit source, lifecycle
  status, and provenance label.
- `WarrantyDocument` stores private object metadata and malware scan time.
- `WarrantyClaim` and `ClaimStatusHistory` separate current queue state from an immutable progression.
- `ServiceCenter` and `RepairRecord` preserve service execution independently from claim submission.
- `OwnershipTransfer` records consent-based transfers without rewriting historical ownership.
- `RecallNotice` targets a product and business with severity and publishing lifecycle.

## Communication, billing, and audit

- `Notification` tracks per-channel delivery and read state.
- `Subscription` can be owned by a user or business and records billing interval and provider
  references. The migration adds a database check ensuring exactly one owner matches `ownerType`.
- `Payment` stores immutable provider references and decimal amounts.
- `AuditLog` is append-oriented, linked to an actor and business context when known. Sensitive document
  content, credentials, raw tokens, and passwords must never appear in `metadata`.

## Important invariants

Migration-level checks supplement Prisma:

- business-issued warranties require an issuer and a business verification label;
- user-uploaded warranties must not have an issuer and must use user-uploaded or pending provenance;
- products must have a business owner or customer owner;
- subscriptions must have exactly one owner matching `ownerType`;
- file sizes must be positive.

Application services must also validate state transitions because cross-row and authorization rules are
not fully expressible as simple database checks.

## Migration workflow

Create a development migration after changing `schema.prisma`:

```bash
pnpm db:migrate --name concise_change_name
pnpm db:generate
```

Apply committed migrations in CI, containers, or production:

```bash
pnpm db:migrate:deploy
```

Never edit a migration that has already been applied to a shared environment. Add a corrective
migration instead. Back up production before destructive schema changes, inspect SQL during review,
and use expand/migrate/contract changes for zero-downtime deployments.

## Development seed

```bash
pnpm db:seed
```

The seed is idempotent for its stable records and contains one customer, one pending business, one
verified business, system role examples, permissions, products, one business-verified warranty, and one
user-uploaded warranty. It creates no login passwords and refuses to run in production.
