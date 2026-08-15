#!/usr/bin/env bash
#
# 02-docker.sh — install Docker and prepare /opt/mvpclub on the Hetzner box.
#
# Run as the NON-ROOT user created by 01-harden.sh:
#   ssh deploy@65.109.81.205
#   chmod +x 02-docker.sh && ./02-docker.sh
#
# Then LOG OUT AND BACK IN so docker group membership applies.
#
# This replaces step 5 of DEPLOY.md (the `curl get.docker.com | sh` + ufw block).
# Steps 6-11 of DEPLOY.md still apply as written.

set -euo pipefail

APP_DIR="/opt/mvpclub"
APP_USER="${SUDO_USER:-$USER}"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -ne 0 ]] || die "Run this as the non-root deploy user (it calls sudo itself)."

export DEBIAN_FRONTEND=noninteractive

# ── 1. Docker Engine, from the official repo ─────────────────────────────────
if command -v docker &>/dev/null; then
  log "Docker already present: $(docker --version)"
else
  log "Installing Docker Engine"
  sudo install -m 0755 -d /etc/apt/keyrings
  . /etc/os-release
  DISTRO="${ID}"   # debian or ubuntu
  curl -fsSL "https://download.docker.com/linux/${DISTRO}/gpg" \
    | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/${DISTRO} ${VERSION_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

sudo systemctl enable --now docker
sudo usermod -aG docker "$APP_USER"

# ── 2. Cap container logs — unbounded json logs are the classic way a server
#      silently fills its disk months later.
log "Capping container log size"
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true
}
EOF
sudo systemctl restart docker

# ── 3. UFW ↔ Docker gotcha ───────────────────────────────────────────────────
# Docker writes its own iptables rules and BYPASSES ufw for published ports.
# The prod compose only publishes 80/443 (which ufw allows anyway), so this is
# not currently a hole — but if you ever add `ports: - "5432:5432"` for Postgres
# "just to debug", it becomes world-reachable despite ufw saying DENY.
# If you need a tunnel target, bind to loopback only: "127.0.0.1:5432:5432".
log "Reminder: any new 'ports:' mapping must bind 127.0.0.1 — Docker bypasses ufw"

# ── 4. App directory ─────────────────────────────────────────────────────────
log "Creating ${APP_DIR}"
sudo mkdir -p "${APP_DIR}"
sudo mkdir -p /var/backups/mvpclub
sudo chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}" /var/backups/mvpclub

# ── 5. Backups: Postgres dump + the interview-audio uploads volume ───────────
# Replaces DEPLOY.md step 11's crontab one-liner, which writes to /root/backups
# (never created) and doesn't cover the uploads volume nightly.
log "Installing backup script"
sudo tee /usr/local/bin/mvpclub-backup.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/opt/mvpclub"
DEST="/var/backups/mvpclub"
STAMP="$(date +%F_%H%M)"
COMPOSE="docker compose -f ${APP_DIR}/docker-compose.prod.yml --env-file ${APP_DIR}/.env.production"

mkdir -p "$DEST"
cd "$APP_DIR"

# shellcheck disable=SC1091
PGUSER="$(grep -E '^POSTGRES_USER=' .env.production | cut -d= -f2-)"
PGDB="$(grep -E '^POSTGRES_DB=' .env.production | cut -d= -f2-)"
PGDB="${PGDB:-mvpclub}"

# 1. Database
$COMPOSE exec -T db pg_dump -U "$PGUSER" "$PGDB" | gzip > "${DEST}/db_${STAMP}.sql.gz"

# 2. Interview audio uploads (named volume, survives rebuilds but not a wiped host)
docker run --rm \
  -v mvpclub_backend_uploads:/u:ro \
  -v "${DEST}":/b \
  alpine tar czf "/b/uploads_${STAMP}.tgz" -C /u . 2>/dev/null || \
  echo "WARN: uploads volume not found (name may differ — check 'docker volume ls')"

# 3. Retention
find "$DEST" -name 'db_*.sql.gz'   -mtime +14 -delete
find "$DEST" -name 'uploads_*.tgz' -mtime +30 -delete

echo "$(date -Is) backup ok: db_${STAMP}.sql.gz ($(du -h "${DEST}/db_${STAMP}.sql.gz" | cut -f1))"
EOF
sudo chmod +x /usr/local/bin/mvpclub-backup.sh

sudo tee /etc/cron.d/mvpclub >/dev/null <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * ${APP_USER} /usr/local/bin/mvpclub-backup.sh >> /var/log/mvpclub-backup.log 2>&1
0  4 * * 0 ${APP_USER} docker system prune -af --filter "until=336h" >> /var/log/mvpclub-backup.log 2>&1
EOF
sudo touch /var/log/mvpclub-backup.log
sudo chown "${APP_USER}:${APP_USER}" /var/log/mvpclub-backup.log

log "Done"
cat <<EOF

  Docker ......  $(docker --version 2>/dev/null || echo 'installed')
  Compose .....  $(docker compose version --short 2>/dev/null || echo 'v2 plugin')
  App dir .....  ${APP_DIR}   (the repo itself goes HERE — compose paths are relative to it)
  Backups .....  nightly 03:30 → /var/backups/mvpclub  (db 14d, uploads 30d)

  LOG OUT AND BACK IN, then verify:
      exit && ssh ${APP_USER}@65.109.81.205
      docker run --rm hello-world

  Next: get the code into ${APP_DIR} (DEPLOY.md step 6), then run 03-deploy.sh.

EOF
