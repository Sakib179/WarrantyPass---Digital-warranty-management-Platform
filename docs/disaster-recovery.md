# WarrantyPass Disaster Recovery & Backup Plan

## Backup Strategy
- **Frequency**: Daily automated PostgreSQL dumps using `scripts/backup-db.sh`.
- **Retention**: 30-day rolling retention in secure object storage.
- **Verification**: Weekly automated restore test into isolated staging database.

## Disaster Recovery Execution Steps

### Scenario 1: Primary Database Corruption or Regional Outage
1. Provision target PostgreSQL 16 instance.
2. Execute restore script:
   ```bash
   DB_HOST=target-db-host DB_PORT=5432 DB_USER=postgres DB_NAME=warrantypass ./scripts/restore-db.sh ./backups/latest.sql.gz
   ```
3. Run forward migration verification:
   ```bash
   pnpm db:migrate:deploy
   ```
4. Verify readiness health check:
   ```bash
   curl https://api.warrantypass.com/health/ready
   ```

### Scenario 2: Security Breach or Credential Compromise
1. Revoke all active sessions via Platform Admin UI or SQL:
   ```sql
   UPDATE "Session" SET "revokedAt" = NOW(), "revokedReason" = 'Security Reset';
   ```
2. Trigger force password reset flags.
3. Review `SecurityEvent` log for compromise vectors.
