# WarrantyPass Production Readiness Checklist

## 1. Database & Security
- [x] Safe forward-only Prisma database migrations applied (`prisma migrate deploy`).
- [x] Session tokens & refresh tokens hashed with SHA-256 before storage.
- [x] Passwords hashed using Argon2id.
- [x] Public authenticity verification rate-limited to prevent brute-force serial enumeration.
- [x] AppError standard enforced with zero raw error stack leakage in production.

## 2. Infrastructure & Monitoring
- [x] Health check endpoints implemented: `/health/live`, `/health/ready`, `/health/dependencies`.
- [x] Structured JSON logging configured across Express API and Next.js frontend.
- [x] Production Dockerfiles created with multi-stage minimal Node 20 runtime.
- [x] Automated backup script (`scripts/backup-db.sh`) and disaster recovery guide (`docs/disaster-recovery.md`).

## 3. Operations & Compliance
- [x] Separate Platform Administration Portal (`/admin`) guarded by `PLATFORM_PERMISSIONS`.
- [x] High-risk admin operations require mandatory audit reasons and emit append-only `AuditLog` entries.
- [x] Privacy data export (JSON payload) and account deletion request workflow implemented.
- [x] Idempotency keys enforced on notification and background job dispatch.
