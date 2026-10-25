#!/bin/bash
# Backup script that runs before the dev server starts
# Creates a timestamped backup so data is never lost
DB_FILE="/home/z/my-project/db/custom.db"
BACKUP_DIR="/home/z/my-project/db/backups"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "$BACKUP_DIR/custom_$TIMESTAMP.db"
  # Keep only the last 24 backups
  cd "$BACKUP_DIR"
  ls -t custom_*.db 2>/dev/null | tail -n +25 | xargs -r rm
  echo "[$(date)] DB backed up to $BACKUP_DIR/custom_$TIMESTAMP.db"
fi
