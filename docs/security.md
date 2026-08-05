# Security and document-storage model

## Customer wallet controls

- Identity comes only from the verified access token; customer IDs are not accepted for owned queries.
- Ownership failure returns a generic 404, list DTOs mask serials, and storage keys never leave the API.
- Private documents stream through authenticated ownership checks with `private, no-store` and
  `nosniff` response headers.
- JPEG, PNG, WebP, and PDF uploads require matching extension, MIME, signature, and size. Keys use
  server UUIDs; original names are display metadata only.
- Uploads begin `PENDING_SCAN`. Production malware scanning must mark them `SAFE` or `REJECTED`.
- Premium mutations re-check backend entitlement. Expiry never removes records or objects.
- Billing webhooks use exact-body HMAC verification, event uniqueness, safe transitions, and audits.

## Part 2 controls

- Argon2id with validated cost settings and passphrase-friendly policy.
- short-lived access tokens and rotating hashed refresh tokens with reuse detection.
- HttpOnly refresh cookie, double-submit CSRF, strict CORS, Helmet, and body limits.
- Redis-backed throttles in production; memory is development-only.
- generic recovery behavior, timed lockouts, request IDs, and sanitized errors.
- separate tenant/platform permission middleware and last-owner protection.
- private file MIME detection, checksums, ownership checks, scan state, and audit events.

Production secrets belong in a secret manager. Rotating refresh-token HMAC material invalidates
outstanding sessions.

## Current Part 1 controls

- Startup validation rejects missing database/secrets, wildcard CORS, insecure production cookies, and
  incomplete S3 configuration.
- Helmet sets secure headers and a restrictive API documentation content-security policy.
- CORS accepts exact configured origins and allows credentialed requests only from them.
- Request IDs and structured Pino logs support correlation; authorization, cookies, password fields,
  and tokens are redacted.
- API request bodies have configurable size limits.
- A rate-limit foundation returns the standard API error envelope.
- Errors are centralized and stack traces, database messages, and causes are never sent to production
  clients.
- Express disables technology disclosure and supports an explicit trusted-proxy setting.
- Password utilities use bcrypt with cost 12. Part 2 must add password pepper/key strategy only if a
  managed secret service is available.
- Token, permission-checking, audit-writing, and secure cookie interfaces are defined without fake
  authentication.
- `.gitignore`, `.env.example`, Gitleaks configuration, and CI secret scanning reduce accidental secret
  commits.

Swagger needs a narrowly scoped inline script/style allowance because its generated HTML includes an
initializer. Business API responses remain JSON and never render untrusted HTML.

## Data classification

### Highly sensitive

- password hashes, session hashes, recovery secrets;
- business verification files and legal identifiers;
- warranty papers, invoices, claim evidence, and repair receipts;
- addresses, phones, and other personally identifiable information.

### Sensitive

- product serial numbers and purchase dates;
- employee membership, roles, and permission history;
- claim, repair, transfer, billing, and audit records.

### Public only by explicit decision

- approved business display profile and authorized service-centre details;
- published recall notices;
- product marketing images explicitly marked public.

Never place secrets, private object URLs, serial numbers, document keys, employee permissions, or raw
provider payloads in browser-visible environment variables.

## Authorization expectations

Every protected API action in later parts must evaluate:

1. authenticated user and non-revoked session;
2. requested business context;
3. active membership in that business;
4. required permission from the membership’s current role;
5. resource ownership or business ownership;
6. record state and soft-deletion state;
7. an auditable decision for sensitive mutations.

Platform administrators require separate explicit authorization and must not silently inherit business
membership. High-risk business actions should support step-up authentication and dual approval later.

## Authentication requirements for Part 2

- Argon2id may replace the bcrypt foundation after deployment constraints are confirmed; no downgrade
  should occur silently.
- Access tokens must be short lived. Refresh tokens must be high entropy, rotated on every use, stored
  only as SHA-256 hashes, grouped into families, and revoked on reuse.
- Refresh tokens belong in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. Non-idempotent cookie-auth
  endpoints require a documented CSRF defense.
- Registration, login, recovery, and verification need endpoint-specific limits without user
  enumeration.
- Email ownership must be verified before sensitive actions.
- Business verification decisions must be restricted to platform reviewers and audited.

## File upload policy

Uploads are not implemented in Part 1. The `StorageProvider` contract prepares local and S3-compatible
adapters.

### Allowed types and initial maximums

| Category                 | Allowed types after signature inspection | Maximum                                |
| ------------------------ | ---------------------------------------- | -------------------------------------- |
| Warranty/invoice/receipt | PDF, JPEG, PNG, WebP                     | 10 MB                                  |
| Business verification    | PDF, JPEG, PNG                           | 15 MB                                  |
| Claim evidence           | PDF, JPEG, PNG, WebP, MP4                | 25 MB (image/document), 100 MB (video) |
| Product image            | JPEG, PNG, WebP                          | 8 MB                                   |

File extensions and browser-provided MIME types are untrusted. The upload finalizer must inspect magic
bytes, reject polyglots where possible, strip unsafe metadata from images, normalize names, and prevent
SVG/HTML/script uploads. Limits must be enforced both before signing and after upload.

### Signed upload flow

1. Client requests an upload intent from the API.
2. API verifies identity, permission, owner, category, declared type, and size.
3. API creates a random object key under a tenant/user namespace and issues a short-lived, single-purpose
   signed upload URL with exact content restrictions.
4. Object enters a private quarantine prefix.
5. An event-driven scanner validates type, computes SHA-256, performs antivirus/malware scanning, and
   sanitizes safe images/documents.
6. Only clean objects are promoted and attached to a domain record.
7. Downloads require fresh authorization and a short-lived signed URL.

The bucket denies public ACLs, requires TLS and server-side encryption (KMS in production), enables
access logs, and uses separate credentials for signing and scanning. Signed URLs must never be logged.

### Private versus public

All customer documents, claim evidence, repair receipts, and verification files are private. Product
images and recall assets become public only through an explicit publication workflow. Object keys are
opaque and do not contain names, emails, registration numbers, or serial numbers.

### Ownership, deletion, and retention

- An object cannot be accessed merely because its key is known; the API reloads the owning domain record
  and authorizes the requester.
- Database deletion and object deletion use an idempotent background job. A tombstone prevents new
  signed URLs while physical deletion is pending.
- Unattached quarantine uploads expire within 24 hours.
- Rejected malware is isolated then destroyed according to incident policy.
- User-deleted personal documents enter a short recovery window before permanent deletion unless a legal
  hold applies.
- Business verification and financial records follow Bangladesh legal/accounting requirements selected
  with counsel before launch.
- Backups and replicas expire through documented lifecycle policies; deletion is audited.

## PII and logs

Collect only data necessary for warranty and service operations. Encrypt storage and backups, enforce
TLS, rotate secrets through a managed secret store, and separate production access by role. Logs use
request IDs rather than document content and apply retention. Audit logs require integrity monitoring
and restricted read permissions.

## Production checklist

- Terminate TLS at a trusted ingress and set `TRUST_PROXY=true` only for the known hop count.
- Set `COOKIE_SECURE=true`; use unique 32+ byte secrets from a secret manager.
- Restrict `CORS_ORIGINS` to deployed web origins.
- Use a least-privileged database user, private networking, backups, PITR, and connection limits.
- Configure object-store encryption, block-public-access, lifecycle, malware scanning, and access logs.
- Export metrics/traces/logs to monitored systems with alerting.
- Run dependency, container, SAST, secret, DAST, and infrastructure scans.
- Complete threat modeling, penetration testing, incident response, recovery tests, and privacy/legal
  review before processing real customer documents.
