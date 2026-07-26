#!/usr/bin/env bash
# Nightly SQLite backup to Backblaze B2 via rclone. Meant to run from cron as
# the deploy user:
#   0 3 * * * /opt/app/scripts/backup-db.sh >> /opt/backups/backup.log 2>&1
#
# Prerequisites (one-time, manual):
#   - rclone installed: curl https://rclone.org/install.sh | sudo bash
#   - a B2 remote named "b2" configured: rclone config
#   - update B2_REMOTE below with your actual bucket name
#
# Uses `sqlite3 .backup` instead of `cp` so the copy is a consistent snapshot
# even while the bot is writing to the database (plain cp of a WAL-mode file
# can copy a torn/inconsistent state).

set -euo pipefail

DB_PATH="/opt/app/packages/bot/data/app.db"
STAGING_DIR="/opt/backups"
B2_REMOTE="b2:REPLACE_WITH_YOUR_BUCKET/whatsapp-bot"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
BACKUP_FILE="${STAGING_DIR}/app-${TIMESTAMP}.db"

mkdir -p "$STAGING_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: database not found at $DB_PATH" >&2
  exit 1
fi

echo "==> [$TIMESTAMP] Creating consistent snapshot"
sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"

echo "==> Uploading to ${B2_REMOTE}"
rclone copy "$BACKUP_FILE" "$B2_REMOTE" --quiet

echo "==> Removing local snapshot"
rm -f "$BACKUP_FILE"

# Belt-and-braces local cleanup in case a previous run left stragglers.
# The main retention policy should live in a B2 lifecycle rule on the bucket.
find "$STAGING_DIR" -maxdepth 1 -type f -name "app-*.db" -mtime +1 -delete

echo "==> Backup complete: ${TIMESTAMP}"
