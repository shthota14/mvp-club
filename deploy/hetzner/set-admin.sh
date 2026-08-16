#!/usr/bin/env bash
#
# set-admin.sh — make admin@mvpclub.io the ONE admin account, with a password
# you choose, and strip admin from everyone else.
#
# Run on the server:
#   cd /opt/mvpclub && ./deploy/hetzner/set-admin.sh
#
# Override the address if you ever need to:
#   ADMIN_EMAIL=someone@mvpclub.io ./deploy/hetzner/set-admin.sh
#
# Safe to re-run. If the account already exists its password is reset to the
# new one. Run this after any database wipe, and after any `migrate-all.sql`
# run. Any legacy admin@mvpclub.com row is renamed to the .io address, so an
# install never ends up with two admin accounts.

set -euo pipefail

APP_DIR="/opt/mvpclub"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@mvpclub.io}"
LEGACY_EMAIL="admin@mvpclub.com"   # renamed to the .io address if still present
ADMIN_NAME="MVP Club Admin"
DC="docker compose -f ${APP_DIR}/docker-compose.prod.yml --env-file ${APP_DIR}/.env.production"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

cd "$APP_DIR" || die "No ${APP_DIR}"
$DC ps --status running --services 2>/dev/null | grep -qx backend || die "backend container is not running"
$DC ps --status running --services 2>/dev/null | grep -qx db      || die "db container is not running"

# ── password ─────────────────────────────────────────────────────────────────
read -rsp "New password for ${ADMIN_EMAIL}: " PW; echo
[[ ${#PW} -ge 10 ]] || die "Use at least 10 characters. This account can reset any user's password."
read -rsp "Confirm: " PW2; echo
[[ "$PW" == "$PW2" ]] || die "Passwords do not match."

# ── hash it inside the backend container (same bcryptjs, same 12 rounds) ─────
log "Hashing"
HASH=$($DC exec -T -e PW="$PW" backend node -e \
  "console.log(require('bcryptjs').hashSync(process.env.PW,12))" | tr -d '\r')
unset PW PW2
[[ "$HASH" == \$2* && ${#HASH} -eq 60 ]] || die "Hash looks wrong: ${HASH:0:12}... (len ${#HASH})"

PSQL="$DC exec -T db psql -U mvpclub -d mvpclub -v ON_ERROR_STOP=1"

# ── create or update the admin, then demote everyone else ────────────────────
log "Setting ${ADMIN_EMAIL} as the sole admin"
$PSQL <<SQL
BEGIN;

-- If an older install created the .com admin, rename it rather than leaving
-- two admin rows behind. Guarded so it can never hit the unique constraint.
UPDATE users SET email = '${ADMIN_EMAIL}'
 WHERE email = '${LEGACY_EMAIL}'
   AND NOT EXISTS (SELECT 1 FROM users WHERE email = '${ADMIN_EMAIL}');
DELETE FROM users
 WHERE email = '${LEGACY_EMAIL}'
   AND EXISTS (SELECT 1 FROM users WHERE email = '${ADMIN_EMAIL}');

INSERT INTO users (email, name, password_hash, current_stage, avatar_initials, is_admin, email_notifications)
VALUES ('${ADMIN_EMAIL}', '${ADMIN_NAME}', '${HASH}', 'idea', 'AD', TRUE, FALSE)
ON CONFLICT (email) DO UPDATE
  SET password_hash       = EXCLUDED.password_hash,
      is_admin            = TRUE,
      name                = EXCLUDED.name,
      email_notifications = FALSE;

-- exactly one admin
UPDATE users SET is_admin = FALSE WHERE email <> '${ADMIN_EMAIL}' AND is_admin;

COMMIT;
SQL

unset HASH

log "Result"
$PSQL -c "SELECT email, name, is_admin FROM users WHERE is_admin;"
echo "  admins total: $($PSQL -tAc 'SELECT count(*) FROM users WHERE is_admin' | tr -d '[:space:]')  (must be 1)"

cat <<EOF

  Log in at https://mvpclub.io with ${ADMIN_EMAIL} and the password you set.
  You will land on /admin automatically.

  Store that password in a password manager. This account can reset any
  user's password, suspend accounts, and delete data.

EOF
