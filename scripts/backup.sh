#!/bin/bash
# ==============================================================
# AI Job Hunter - Database Backup Script
# ==============================================================

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ai_job_hunter_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "Creating backup: $BACKUP_FILE"

docker exec ai-job-hunter-postgres pg_dump \
    -U "${POSTGRES_USER:-jobhunter}" \
    "${POSTGRES_DB:-ai_job_hunter}" \
    > "$BACKUP_FILE"

echo "✓ Backup saved: $BACKUP_FILE"

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/*.sql | tail -n +11 | xargs rm -f 2>/dev/null || true

echo "Backup complete. Files in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/*.sql
