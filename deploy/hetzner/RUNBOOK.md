# Hetzner AX41 → MVP Club production runbook

**Server:** AX41-1-LTD #3056582 · `65.109.81.205` · `2a01:4f9:3051:4fe8::2`
**Ordered:** 14 Aug 2026 · **Target domain:** `mvpclub.io`

This runbook covers what your existing `DEPLOY.md` does *not*: you bought a
**dedicated (Robot) server**, not a Hetzner **Cloud** VPS. `DEPLOY.md` assumes a
Cloud instance created with an SSH key already installed and password auth off.
Yours arrived with a **root password over SSH**, which is the single most
attacked surface on the internet. Everything in Part 1 exists to close that gap.

Parts 2–4 then hand off to `DEPLOY.md`, with the handful of places it needs
amending for a dedicated box called out explicitly.

---

## ⚠️ Do this first

The root password from the Hetzner email is now in a chat transcript and in
your mail client. Treat it as compromised.

The server has been online with password auth since 14 Aug — assume it has
already been hit by credential-stuffing bots (every Hetzner IP is, within
minutes). Part 1 rotates the password *and* removes password login entirely.
If anything in Part 1's verification looks off, the fastest clean answer on a
dedicated server is a fresh install from the Robot rescue system rather than
trying to audit a possibly-touched box.

---

## Part 0 — Prerequisites on your Mac (5 min)

**An SSH key.** Check first:

```bash
ls ~/.ssh/id_ed25519.pub
```

If it's missing:

```bash
ssh-keygen -t ed25519 -C "shthota@gmail.com"      # press Enter for defaults, SET a passphrase
cat ~/.ssh/id_ed25519.pub                          # copy this whole line
```

**Verify the host key before you connect.** Hetzner emailed you the
fingerprints. On first connection SSH will show one — it must match
`XM12eVwAYTxfo2loAN/S8Ze2DJHawyE5quuyzfSE1+8` (ED25519). If it doesn't, stop
and don't type the password.

```bash
ssh-keyscan -t ed25519 65.109.81.205 2>/dev/null | ssh-keygen -lf -
```

**Add a convenience host entry** to `~/.ssh/config` (do this after Part 1):

```
Host mvpclub
  HostName 65.109.81.205
  User deploy
  IdentityFile ~/.ssh/id_ed25519
  ServerAliveInterval 60
```

---

## Part 1 — Harden the server (15 min)

### 1.1 Edit the script

Open `01-harden.sh` and set the five values at the top. The only one you
*must* change is `SSH_PUBLIC_KEY` — paste the full `ssh-ed25519 AAAA... ` line
from `~/.ssh/id_ed25519.pub`.

Defaults are: user `deploy`, port `22`, hostname `mvpclub-prod`, timezone
`Europe/London`, 8 GB swap. Keeping SSH on port 22 is fine — fail2ban plus
key-only auth is the real protection; a non-standard port only reduces log
noise. Change it if you want quieter logs.

### 1.2 Run it

```bash
scp 01-harden.sh root@65.109.81.205:/root/
ssh root@65.109.81.205                         # last time you'll use this password
chmod +x /root/01-harden.sh && /root/01-harden.sh
```

### 1.3 Verify from a **second** terminal — before closing the first

This is the step people skip and then lock themselves out.

```bash
ssh deploy@65.109.81.205 'sudo whoami'         # must print: root
ssh root@65.109.81.205                          # must be REFUSED
```

Only once both behave correctly, go back to the first terminal and rotate the
emailed root password (it stays valid on the Robot KVM/rescue console, which is
your way back in if SSH ever breaks):

```bash
passwd                                          # pick something long and random
exit
```

Store that new password in a password manager, not in email.

### 1.4 Dedicated-server-only checks

A Cloud VPS has none of these; a dedicated box does. Run as `deploy`:

```bash
# RAID health — Hetzner installs software RAID 1 across the two NVMe drives.
# "[UU]" = both healthy. "[U_]" = a disk is dead, open a Robot support ticket.
cat /proc/mdstat

# Disk layout and free space
lsblk && df -h

# RAM and CPU you're actually working with
free -h && nproc && lscpu | grep 'Model name'

# NVMe wear/health
sudo apt install -y nvme-cli && sudo nvme smart-log /dev/nvme0n1 | grep -i 'percentage_used\|critical'
```

Also enable **email alerts for RAID failure** — on a dedicated server nobody
tells you a disk died:

```bash
sudo apt install -y mdadm
sudo sed -i 's/^MAILADDR.*/MAILADDR shthota@gmail.com/' /etc/mdadm/mdadm.conf
sudo update-initramfs -u
```

(This needs a working local MTA to actually deliver; if you skip the MTA, at
least run `cat /proc/mdstat` when you log in. See Part 5 for monitoring.)

---

## Part 2 — Docker and backups (10 min)

```bash
scp 02-docker.sh deploy@65.109.81.205:~
ssh deploy@65.109.81.205
chmod +x 02-docker.sh && ./02-docker.sh
exit                                            # REQUIRED — group membership
ssh deploy@65.109.81.205
docker run --rm hello-world                     # must succeed without sudo
```

**This replaces step 5 of `DEPLOY.md`.** That step's `curl get.docker.com | sh`
works but installs as root-only, sets no log limits, and its ufw block runs
before you have a non-root user.

It also replaces **step 11's backup crontab**, which has two real problems:
it writes to `/root/backups` without ever creating it (so the cron silently
fails), and it only backs up Postgres — not the `backend_uploads` volume where
interview audio lives. The installed `/usr/local/bin/mvpclub-backup.sh` does
both nightly at 03:30 into `/var/backups/mvpclub`.

### Get backups off the machine

RAID 1 protects against a disk dying. It does not protect against `DROP TABLE`,
a bad migration, or the whole server being reclaimed. Pull dumps to your Mac —
add to your Mac's crontab or run manually before anything risky:

```bash
rsync -av deploy@65.109.81.205:/var/backups/mvpclub/ ~/Backups/mvpclub/
```

Hetzner's **Storage Box** (~€3.50/mo for 1 TB, Robot → Storage Box) is the
proper answer, mountable over SSHFS/BorgBackup. Note that `DEPLOY.md` step 11
suggests "Hetzner's built-in server Backups option" — that's a **Cloud-only**
feature and is *not* available on your dedicated server. Storage Box is the
dedicated-server equivalent.

---

## Part 3 — DNS and email (do before deploying)

`DEPLOY.md` steps 3 and 4 are correct and complete. Two amendments:

**DNS (step 3)** — the IP is now known. At Namecheap → `mvpclub.io` →
Advanced DNS:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | `65.109.81.205` | Automatic |
| A | www | `65.109.81.205` | Automatic |
| AAAA | @ | `2a01:4f9:3051:4fe8::2` | Automatic |
| AAAA | www | `2a01:4f9:3051:4fe8::2` | Automatic |

The AAAA records are optional but free — you have a whole `/64`. Add them only
if `ping6 -c1 2a01:4f9:3051:4fe8::2` works from the server; a broken AAAA
record is worse than none because IPv6-capable clients will try it first.

Wait for propagation before starting Caddy — a failed certificate attempt
counts against Let's Encrypt's rate limit (5 failures per account per hostname
per hour):

```bash
dig +short mvpclub.io @1.1.1.1                  # must return 65.109.81.205
```

**Email (step 4)** — your Brevo choice on port **587** is exactly right, and
worth understanding why: Hetzner blocks outbound ports **25 and 465** on all
servers by default (it's in your provisioning email). Port 587 is not blocked.
Had `DEPLOY.md` picked a provider defaulting to 465, mail would have failed
silently in production with a connection timeout. Keep `SMTP_SECURE=false`
with port 587 — that's STARTTLS, still encrypted, not plaintext.

---

## Part 4 — Deploy (20 min)

Follow `DEPLOY.md` steps 6–9 as written. Concretely:

```bash
# 6. Code onto the server. /opt/mvpclub IS the repo root — the compose file
#    mounts ./deploy/Caddyfile and ./backend/src/db/schema.sql relative to it.
#    Option A (recommended, makes updates a git pull):
ssh deploy@65.109.81.205 'git clone git@github.com:<you>/mvp-club.git /opt/mvpclub'

#    Option B (rsync from your Mac):
rsync -av --exclude node_modules --exclude dist --exclude .git \
      --exclude _to_delete --exclude _patches\* \
      "/Users/shyamthota/Projects/MVP Club/" deploy@65.109.81.205:/opt/mvpclub/

# 7. Secrets
ssh deploy@65.109.81.205
cd /opt/mvpclub
cp deploy/env.production.example .env.production
chmod 600 .env.production
nano .env.production          # every CHANGE_ME → openssl rand -hex 32
                              # plus real Brevo SMTP_USER / SMTP_PASS

# 8. Launch (via the wrapper — adds backup, health gate, migration check)
cp ~/03-deploy.sh . && chmod +x 03-deploy.sh
./03-deploy.sh
```

The script refuses to run while any `CHANGE_ME` remains in `.env.production` —
shipping the example JWT secret to production is the kind of thing that only
gets noticed later.

### Migrations are manual — this is the sharp edge

Nothing applies migrations for you. First boot creates the schema from
`schema.sql` via the Postgres init hook, then you apply feature migrations by
hand, **in order**:

```bash
alias psqlprod='docker compose -f /opt/mvpclub/docker-compose.prod.yml \
  --env-file /opt/mvpclub/.env.production exec -T db psql -U mvpclub -d mvpclub'

psqlprod < backend/src/db/migrate-all.sql
psqlprod < backend/src/db/add-interview-recordings.sql
```

Then check nothing is outstanding — the AI interview-alignment work from late
July added a migration that (per your own project notes) may not have been run
anywhere yet:

```bash
ls backend/src/db/*.sql backend/src/db/migrations/*.sql 2>/dev/null
psqlprod -c '\d interviews'      # confirm ai_alignment_score, ai_reasoning,
                                 # ai_evidence, ai_chat_log columns exist
```

A missing migration doesn't stop the container — it surfaces as a 500 the first
time a founder uses that feature.

On every future deploy, `03-deploy.sh` diffs the SQL directory against the last
deployed commit and prints exactly which files are new.

---

## Part 5 — After it's live

### Verify

Work through `DEPLOY.md`'s pre-flight checklist. The ones with real teeth:

```bash
curl -I https://mvpclub.io                       # 200, valid cert
curl -s https://mvpclub.io/api/health            # backend reachable through nginx→Caddy
```

Then in a browser, on the live domain: sign up → create an idea → log an
interview → record 5 seconds of audio (needs HTTPS for mic access) → trigger a
password reset and confirm the mail arrives from `hello@mvpclub.io`.

Given your Validate-flow work, also click through Validate steps 3→7 once —
the reorder (Assumptions → Targeting → Script → Contacts → Schedule) was
verified by `tsc` but never exercised in a running app, because localhost was
unreachable from the sandbox all session. Production is the first place it
actually runs.

### Connect to Postgres from your Mac (without exposing it)

**Never add a bare `ports: - "5432:5432"` mapping to the `db` service.** Docker
writes its own iptables rules and **bypasses ufw** for published ports — the
database would be world-reachable while `ufw status` still says DENY.

Simplest option, no compose change at all — just get a psql prompt:

```bash
ssh deploy@65.109.81.205 -t \
  'docker compose -f /opt/mvpclub/docker-compose.prod.yml --env-file /opt/mvpclub/.env.production exec db psql -U mvpclub -d mvpclub'
```

If you want a GUI client (TablePlus, DBeaver) pointed at production, you need
a tunnel — and a tunnel needs something listening on the server's loopback.
Bind the container port to `127.0.0.1` **only**, which Docker does *not* expose
publicly and ufw doesn't need to cover. Add to the `db` service:

```yaml
    ports:
      - "127.0.0.1:5432:5432"      # loopback only — NOT "5432:5432"
```

Then from your Mac:

```bash
ssh -N -L 5433:127.0.0.1:5432 deploy@65.109.81.205 -o ExitOnForwardFailure=yes &
# point the client at localhost:5433 — same port as your dev setup
```

Verify it's genuinely not public before trusting it — from your Mac, this must
time out or refuse:

```bash
nc -zv 65.109.81.205 5432
```

### Routine checks

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=100
df -h && free -h
cat /proc/mdstat                    # RAID still [UU]?
sudo fail2ban-client status sshd    # how many bots got banned
tail /var/log/mvpclub-backup.log    # backups actually running?
ls -lh /var/backups/mvpclub/        # and producing non-empty files
```

### Restore from a backup

```bash
cd /opt/mvpclub
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
$COMPOSE stop backend                                   # stop writes first
gunzip -c /var/backups/mvpclub/db_2026-08-16_0330.sql.gz \
  | $COMPOSE exec -T db psql -U mvpclub -d mvpclub
$COMPOSE start backend
```

Test this **once, now, on a throwaway database** — an untested backup is a
guess. A restore you've never run is the thing that fails at 2am.

### Rollback a bad deploy

```bash
cd /opt/mvpclub
git log --oneline -10
git checkout <last-good-sha>
./03-deploy.sh
```

If the bad deploy ran a migration, code rollback alone won't help — restore the
pre-deploy dump too (`03-deploy.sh` takes one automatically before every
deploy, so it's in `/var/backups/mvpclub/` with that timestamp).

---

## What each file does

| File | Runs as | When | Purpose |
|---|---|---|---|
| `01-harden.sh` | root, on server | Once, first | User, SSH keys, firewall, fail2ban, auto-updates, swap |
| `02-docker.sh` | `deploy`, on server | Once, second | Docker, log caps, backup cron. Replaces DEPLOY.md §5 + §11 |
| `03-deploy.sh` | `deploy`, in `/opt/mvpclub` | Every deploy | Wraps DEPLOY.md §8/§10 with backup + health gate + migration diff |
| `DEPLOY.md` (in repo) | — | Reference | Domain, DNS, Zoho/Brevo email, app specifics — still the source of truth for §3, §4, §6–§9 |

---

## Costs worth knowing

- **AX41 dedicated** — this is a physical machine, far more than MVP Club needs
  at launch. That's fine; it means you won't touch capacity for a long time.
- Hetzner **Cloud** features referenced in `DEPLOY.md` (automatic Backups,
  Snapshots, the Cloud console firewall) do **not** apply to Robot dedicated
  servers. Your equivalents are: the backup script here, a Storage Box, and ufw.
- Ports 25/465 stay blocked unless you open a Robot support request. You don't
  need them — Brevo on 587 covers it.
