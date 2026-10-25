#!/bin/bash
# Safe database push — backs up the DB before running prisma db:push
# This prevents data loss when schema changes require table recreation

DB_FILE="db/custom.db"
BACKUP_FILE="db/custom.db.backup.$(date +%Y%m%d%H%M%S)"

if [ -f "$DB_FILE" ]; then
  echo "📦 Backing up database to $BACKUP_FILE..."
  cp "$DB_FILE" "$BACKUP_FILE"
  echo "✅ Backup created"
fi

echo "🔄 Running prisma db:push..."
bun run db:push

if [ $? -eq 0 ]; then
  echo "✅ Schema pushed successfully"
else
  echo "❌ db:push failed — restoring from backup..."
  cp "$BACKUP_FILE" "$DB_FILE"
  echo "✅ Database restored"
fi
