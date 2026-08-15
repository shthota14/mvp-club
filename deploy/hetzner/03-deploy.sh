#!/usr/bin/env bash
#
# 03-deploy.sh — first launch and every subsequent update of MVP Club.
#
# Put this at /opt/mvpclub/03-deploy.sh (i.e. inside the repo root on the server)
# and run it as the deploy user:
#
#   cd /opt/mvpclub && ./03-deploy.sh
#
# Wraps DEPLOY.md steps 8 and 10, adding: a pre-deploy DB backup, a health
# gate, and a check for migration files you haven't applied yet.
#
# Sync mode is controlled by SYNC:
#   SYNC=git    (default) git pull in /opt/mvpclub
#   SYNC=none   you rsync'd from your Mac already; just rebuild

set -euo pipefail

APP_DIR="/opt/mvpclub"
ENV_FILE="${APP_DIR}/.env.production"
COMPOSE="docker compose -f ${APP_DIR}/docker-compose.prod.yml --env-file ${ENV_FILE}"
SYNC="${SYNC:-git}"
BRANCH="${BRANCH:-main}"
STATE="${APP_DIR}/.last-deployed-sha"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\n\033[1;33m[!]\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

cd "$APP_DIR" || die "No ${APP_DIR}. Run 02-docker.sh and copy the repo there first."
[[ -f "$ENV_FILE" ]] || die "Missing ${ENV_FILE}. Copy deploy/env.production.example and fill it in (DEPLOY.md step 7)."
[[ -f "${APP_DIR}/docker-compose.prod.yml" ]] || die "Missing docker-compose.prod.yml — is the repo actually in ${APP_DIR}?"
[[ -f "${APP_DIR}/deploy/Caddyfile" ]] || die "Missing deploy/Caddyfile — incomplete copy of the repo."

# Refuse to deploy with placeholder secrets still in place.
if grep -q 'CHANGE_ME' "$ENV_FILE"; then
  grep -n 'CHANGE_ME' "$ENV_FILE"
  die "${ENV_FILE} still contains CHANGE_ME placeholders. Fill them in first."
fi
chmod 600 "$ENV_FILE"

# ── 1. Sync source ───────────────────────────────────────────────────────────
PREV_SHA=""
[[ -f "$STATE" ]] && PREV_SHA="$(cat "$STATE")"

if [[ "$SYNC" == "git" && -d "${APP_DIR}/.git" ]]; then
  log "Pulling ${BRANCH}"
  git fetch --all --prune
  git checkout "$BRANCH"
  git pull --ff-only
elif [[ "$SYNC" == "git" ]]; then
  warn "No .git in ${APP_DIR} — assuming you rsync'd. Skipping pull."
  SYNC="none"
else
  log "SYNC=none — rebuilding from whatever is on disk"
fi

NEW_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'no-git')"
log "Deploying ${NEW_SHA}"

# ── 2. Back up before changing anything ──────────────────────────────────────
if $COMPOSE ps --services --status running 2>/dev/null | grep -qx db; then
  log "Pre-deploy database backup"
  /usr/local/bin/mvpclub-backup.sh || warn "Backup failed — continuing anyway (check this)"
else
  warn "DB not running — first deploy, nothing to back up"
fi

# ── 3. Build and start ───────────────────────────────────────────────────────
log "Building and starting"
$COMPOSE up -d --build --remove-orphans

# ── 4. Health gate ───────────────────────────────────────────────────────────
# The backend listens on 4000 inside the compose network and is not published
# to the host, so check it from inside the frontend container (which proxies
# /api to it) rather than from the host.
log "Waiting for backend /health"
OK=0
for i in $(seq 1 40); do
  if $COMPOSE exec -T backend wget -qO- http://localhost:4000/health >/dev/null 2>&1; then
    OK=1; log "Backend healthy after ${i} attempt(s)"; break
  fi
  sleep 3
done

if [[ $OK -ne 1 ]]; then
  warn "Backend never became healthy. Last 80 lines:"
  $COMPOSE logs --tail=80 backend
  die "Deploy unhealthy. Roll back: git checkout ${PREV_SHA:-<previous-sha>} && ./03-deploy.sh"
fi

# ── 5. Unapplied migrations ──────────────────────────────────────────────────
# Migrations in this project are hand-written SQL run manually — nothing
# applies them for you, and a missing one shows up as a runtime 500, not a
# startup failure. So surface the diff loudly.
log "Checking for new SQL since last deploy"
if [[ -n "$PREV_SHA" && "$NEW_SHA" != "no-git" ]]; then
  NEW_SQL="$(git diff --name-only "${PREV_SHA}..HEAD" -- 'backend/src/db/*.sql' 'backend/src/db/migrations/*.sql' 2>/dev/null || true)"
  if [[ -n "$NEW_SQL" ]]; then
    warn "NEW SQL FILES since ${PREV_SHA} — apply each one now:"
    echo "$NEW_SQL" | sed 's/^/    /'
    echo
    echo "    cd ${APP_DIR}"
    echo "$NEW_SQL" | sed "s|^|    ${COMPOSE} exec -T db psql -U \$POSTGRES_USER -d \$POSTGRES_DB < |"
  else
    log "No new SQL files"
  fi
else
  warn "No previous SHA recorded — if this is the FIRST deploy, apply the base migrations now:"
  cat <<'EOM'
    alias psqlprod='docker compose -f /opt/mvpclub/docker-compose.prod.yml --env-file /opt/mvpclub/.env.production exec -T db psql -U mvpclub -d mvpclub'
    psqlprod < backend/src/db/migrate-all.sql
    psqlprod < backend/src/db/add-interview-recordings.sql
EOM
fi

echo "$NEW_SHA" > "$STATE"

# ── 6. Summary ───────────────────────────────────────────────────────────────
echo
$COMPOSE ps
DOMAIN="$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d= -f2-)"
cat <<EOF

  Deployed ..  ${NEW_SHA}
  Live at ...  https://${DOMAIN:-<DOMAIN not set>}
  Logs ......  ${COMPOSE} logs -f
  Rollback ..  git checkout ${PREV_SHA:-<sha>} && ./03-deploy.sh
               (then restore a dump from /var/backups/mvpclub if a migration ran)

EOF
