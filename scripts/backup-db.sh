#!/bin/bash
# Backup the VSBEC Placement database
BACKUP_DIR="/home/z/my-project/db/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/custom_db_backup_$TIMESTAMP.db"
cp /home/z/my-project/db/custom.db "$BACKUP_FILE"
echo "Database backed up to: $BACKUP_FILE"
# Keep only the last 5 backups
ls -t "$BACKUP_DIR"/custom_db_backup_*.db | tail -n +6 | xargs rm -f 2>/dev/null
