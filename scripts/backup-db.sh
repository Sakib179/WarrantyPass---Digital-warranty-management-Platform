#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/warrantypass_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

PGPASSWORD="${DB_PASSWORD:-postgres}" pg_dump \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5433}" \
  -U "${DB_USER:-postgres}" \
  -d "${DB_NAME:-warrantypass}" \
  | gzip > "${FILENAME}"

echo "[WarrantyPass DB Backup] Successfully exported compressed backup to ${FILENAME}"
