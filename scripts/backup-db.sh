#!/bin/bash
# Hourly database backup — keeps the last 24 backups
DB_FILE="/home/z/my-project/db/custom.db"
BACKUP_DIR="/home/z/my-project/db/backups"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "$BACKUP_DIR/custom_$TIMESTAMP.db"
  # Keep only the last 24 backups (24 hours)
  cd "$BACKUP_DIR"
  ls -t custom_*.db | tail -n +25 | xargs -r rm
  echo "[$(date)] DB backed up to $BACKUP_DIR/custom_$TIMESTAMP.db"
fi
