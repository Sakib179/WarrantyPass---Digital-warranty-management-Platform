#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: ./scripts/restore-db.sh <path-to-backup-file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file ${BACKUP_FILE} not found."
  exit 1
fi

echo "[WarrantyPass DB Restore] Restoring database from ${BACKUP_FILE}..."

gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${DB_PASSWORD:-postgres}" psql \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5433}" \
  -U "${DB_USER:-postgres}" \
  -d "${DB_NAME:-warrantypass}"

echo "[WarrantyPass DB Restore] Restore completed successfully."
