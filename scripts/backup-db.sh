#!/usr/bin/env bash
# Nightly SQLite backup to Backblaze B2 via rclone. Meant to run from cron as
# the deploy user:
#   0 3 * * * /opt/app/scripts/backup-db.sh >> /opt/backups/backup.log 2>&1
#
# Prerequisites (one-time, manual):
#   - rclone installed: curl https://rclone.org/install.sh | sudo bash
#   - a B2 remote named "b2" configured: rclone config
#   - B2_REMOTE=b2:your-bucket/whatsapp-bot added to /opt/app/.env
#
# B2_REMOTE lives in .env (not hardcoded here) because this script is a
# tracked file: /opt/app is reset with `git reset --hard` on every deploy
# (see deploy.sh), so any value edited directly into this file on the VPS
# would silently disappear on the next push. .env is gitignored and never
# touched by that reset.
#
# Uses `sqlite3 .backup` instead of `cp` so the copy is a consistent snapshot
# even while the bot is writing to the database (plain cp of a WAL-mode file
# can copy a torn/inconsistent state).

set -euo pipefail

APP_ENV_FILE="/opt/app/.env"
DB_PATH="/opt/app/packages/bot/data/app.db"
STAGING_DIR="/opt/backups"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
BACKUP_FILE="${STAGING_DIR}/app-${TIMESTAMP}.db"

if [ -f "$APP_ENV_FILE" ]; then
  # Read just this one key instead of sourcing the whole file: .env also
  # defines its own DB_PATH (a relative path meant for the bot process,
  # whose cwd is packages/bot) which would otherwise clobber DB_PATH above.
  B2_REMOTE="$(grep -m1 '^B2_REMOTE=' "$APP_ENV_FILE" | cut -d= -f2-)"
fi

if [ -z "${B2_REMOTE:-}" ]; then
  echo "ERROR: B2_REMOTE is not set. Add a line like the following to $APP_ENV_FILE:" >&2
  echo "  B2_REMOTE=b2:your-bucket/whatsapp-bot" >&2
  exit 1
fi

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
