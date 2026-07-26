#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 VPS (Hetzner CX22/CX23).
# Run as root: bash provision-vps.sh
#
# What it does:
#   - Creates a non-root sudo user to own the app and run deploys
#   - Installs Node.js LTS, pm2, git, build tools (needed by better-sqlite3), sqlite3 CLI
#   - Configures ufw (SSH only) and fail2ban
#   - Creates /opt/app (git checkout) and /opt/backups (backup staging)
#
# What it does NOT do:
#   - Clone the repo (do it manually as the deploy user, see AGENTS.MD > Deployment)
#   - Create .env (copy it manually, it must never go through git or CI)
#   - Add the GitHub Actions public key to authorized_keys (see step 4 below)

set -euo pipefail

DEPLOY_USER="deploy"
NODE_MAJOR="22"
APP_DIR="/opt/app"
BACKUP_DIR="/opt/backups"

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: run this script as root." >&2
  exit 1
fi

echo "==> [1/8] Updating system packages"
apt-get update -y
apt-get upgrade -y

echo "==> [2/8] Installing base packages"
apt-get install -y curl git ufw fail2ban build-essential python3 sqlite3 ca-certificates

echo "==> [3/8] Installing Node.js ${NODE_MAJOR}.x (NodeSource)"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==> [4/8] Installing pm2 globally"
npm install -g pm2

echo "==> [5/8] Creating deploy user"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
fi
mkdir -p "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 700 "/home/${DEPLOY_USER}/.ssh"
chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"

echo "    -> Paste your PERSONAL public key into /home/${DEPLOY_USER}/.ssh/authorized_keys now if not done yet."
echo "    -> The dedicated GitHub Actions deploy key gets added there too, later (see AGENTS.MD)."

echo "==> [6/8] Creating app and backup directories"
mkdir -p "$APP_DIR" "$BACKUP_DIR"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "$APP_DIR" "$BACKUP_DIR"

echo "==> [7/8] Configuring ufw (SSH only)"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw --force enable
ufw status verbose

echo "==> [8/8] Enabling fail2ban for sshd"
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
bantime = 1h
findtime = 10m
EOF
systemctl enable fail2ban
systemctl restart fail2ban

cat <<EOF

==> Provisioning done.

Next manual steps (see AGENTS.MD > Deployment for full detail):
  1. Harden SSH: disable root login and password auth in /etc/ssh/sshd_config, then
     'systemctl restart ssh' -- only after confirming key-based login works for ${DEPLOY_USER}.
  2. As ${DEPLOY_USER}: generate a VPS -> GitHub deploy key and add it as a read-only
     Deploy Key on the repo (Settings > Deploy keys).
  3. As ${DEPLOY_USER}: git clone the repo into ${APP_DIR}.
  4. Copy the root .env file into ${APP_DIR}/.env (never via git).
  5. Run 'npm install' and 'npm run db:migrate' once manually, then start pm2
     (see AGENTS.MD > Deployment > First deploy).
  6. Generate a SEPARATE GitHub Actions deploy key and add its public half to
     /home/${DEPLOY_USER}/.ssh/authorized_keys, then store the private half as the
     SSH_PRIVATE_KEY GitHub secret.
EOF
