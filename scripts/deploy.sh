#!/usr/bin/env bash
# Runs ON THE VPS, invoked over SSH by .github/workflows/deploy.yml on every
# push to master. Also safe to run manually for the first deploy or to force
# a redeploy: ssh deploy@<host> 'bash /opt/app/scripts/deploy.sh'
#
# Fails loudly on purpose: `set -euo pipefail` plus an explicit post-restart
# status check mean any broken step (pull, install, migrate, restart) stops
# the script with a non-zero exit code, which the GitHub Actions job surfaces
# as a failed run -- never a silent partial deploy.

set -euo pipefail

APP_DIR="/opt/app"
BOT_WORKSPACE="packages/bot"
APP_NAME="whatsapp-bot"

cd "$APP_DIR"

echo "==> Fetching latest master"
git fetch origin master
git reset --hard origin/master

echo "==> Installing dependencies (bot workspace only)"
npm install --workspace="$BOT_WORKSPACE" --no-audit --no-fund

# Not tracked by git (holds the SQLite DB) -- a fresh clone won't have it.
mkdir -p "$BOT_WORKSPACE/data"

echo "==> Running Drizzle migrations"
npm run db:migrate --workspace="$BOT_WORKSPACE"

echo "==> Restarting whatsapp-bot with pm2 (restart, not reload)"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start "$BOT_WORKSPACE/ecosystem.config.cjs"
fi
pm2 save

echo "==> Verifying process came back online"
sleep 5
STATUS=$(pm2 jlist | node -e "
const apps = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const app = apps.find((a) => a.name === '$APP_NAME');
process.stdout.write(app ? app.pm2_env.status : 'missing');
")

if [ "$STATUS" != "online" ]; then
  echo "ERROR: '$APP_NAME' status is '$STATUS' after restart, expected 'online'." >&2
  echo "---- last 50 log lines ----" >&2
  pm2 logs "$APP_NAME" --lines 50 --nostream >&2 || true
  exit 1
fi

echo "==> Deploy OK (status: $STATUS)"
