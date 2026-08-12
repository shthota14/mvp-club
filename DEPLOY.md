# Deploying MVP Club to Hetzner

One VPS runs everything: Postgres, the API, the frontend, and Caddy (which gets
HTTPS certificates automatically). Rough cost: Hetzner's smallest shared-vCPU
Cloud server is a few euros a month and is plenty to launch on.

## 1. Domain — done ✓

`mvpclub.io`, bought via Namecheap. Decline every checkout add-on except free
Domain Privacy — no SSL, hosting, or DNS add-ons needed (Caddy handles TLS;
see step 5 below for DNS).

## 2. Create the server

1. console.hetzner.cloud → New Project → Add Server
2. Location: Falkenstein or Nuremberg (or Ashburn for US users)
3. Image: **Ubuntu 24.04**
4. Type: smallest shared vCPU (2 vCPU / 4 GB is comfortable)
5. Add your **SSH key** (don't use password auth)
6. Create. Note the server's public IP.

## 3. Point DNS at the server

At Namecheap (Domain List → mvpclub.io → Manage → Advanced DNS), create two
records (before deploying, so certificates issue immediately):

| Type | Host | Value       |
|------|------|-------------|
| A    | @    | <server IP> |
| A    | www  | <server IP> |

## 4. Email — hello@mvpclub.io

Two separate jobs, both free, both live on the same Namecheap DNS page as
step 3. Do them together while you're in there.

**A. A real inbox for you (Zoho Mail, free forever, 1 user / 5GB)**

This is the mailbox you personally read and reply from as `hello@mvpclub.io`
— webmail + mobile app, not used by the app itself.

1. mail.zoho.com → Sign Up → **Free Plan** → add domain `mvpclub.io`
2. Zoho gives you a TXT record to verify domain ownership — add it in
   Namecheap's Advanced DNS, then click Verify back in Zoho
3. Zoho then shows you its MX records — enter these three in Namecheap
   (delete Namecheap's default "PARK" MX first):

   | Type | Host | Value       | Priority |
   |------|------|-------------|----------|
   | MX   | @    | mx.zoho.com | 10       |
   | MX   | @    | mx2.zoho.com| 20       |
   | MX   | @    | mx3.zoho.com| 50       |

4. Add the SPF record Zoho asks for (see the combined SPF record in section B
   below — you only get one SPF TXT record per domain, so it has to cover
   both Zoho and Brevo together)
5. Add the DKIM CNAME Zoho generates for you in its setup wizard (this value
   is unique to your account — copy it exactly from the Zoho dashboard)
6. Create the mailbox `hello@mvpclub.io` inside Zoho once the domain shows
   verified

Note: Zoho's free plan is webmail/app-only — it does **not** include
IMAP/POP/SMTP relay access, so this mailbox can't be plugged into the app's
`SMTP_*` settings. That's fine — it's for you, not the app. If you'd rather
have IMAP so you can read it from the Gmail/Mail app, Zoho's cheapest paid
tier (Mail Lite, ~$1/user/month) unlocks that; not required to launch.

**B. Transactional email for the app (Brevo, free forever, 300 emails/day)**

This is what `nodemailer` in `backend/src/utils/mailer.ts` actually sends
through — password resets, interview invites, weekly digests. A personal
mailbox isn't built for this; a dedicated transactional sender is standard
practice and free at this volume.

1. app.brevo.com → sign up free → Senders, Domains & Dedicated IPs → add and
   authenticate `mvpclub.io`
2. Brevo shows you a **Brevo code TXT record** and a **DKIM CNAME/TXT record**
   — both unique to your account, add them exactly as shown in Namecheap
3. Combine Zoho's and Brevo's SPF requirements into **one** SPF TXT record
   (a domain can only have one):
   `v=spf1 include:zohomail.com include:<brevo's SPF include value> ~all`
   (Brevo shows its exact include value on the same authentication screen)
4. Once Brevo shows the domain as verified, go to SMTP & API → SMTP tab and
   copy your **SMTP login** and **SMTP key** (not your Brevo account
   password — a separate generated key)
5. Put these in `.env.production` (already templated in
   `deploy/env.production.example`):
   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<Brevo SMTP login>
   SMTP_PASS=<Brevo SMTP key>
   MAIL_FROM=hello@mvpclub.io
   MAIL_FROM_NAME=MVP Club
   ```

DNS propagation for MX/TXT/CNAME records can take anywhere from a few
minutes to a few hours. Both dashboards (Zoho, Brevo) show a live
verified/pending status — wait for green before moving on.

## 5. Prepare the server

SSH in as root, then:

```bash
# Basic firewall — only SSH + web
apt update && apt install -y ufw
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

# Docker (official convenience script)
curl -fsSL https://get.docker.com | sh
```

## 6. Get the code onto the server

Either push the project to a private GitHub repo and `git clone` it (recommended
so future deploys are `git pull`), or copy it directly:

```bash
# from your Mac — excludes node_modules etc.
rsync -av --exclude node_modules --exclude dist --exclude .git \
  "/Users/shyamthota/Projects/MVP Club/" root@<server-ip>:/opt/mvpclub/
```

## 7. Configure secrets

```bash
cd /opt/mvpclub
cp deploy/env.production.example .env.production
nano .env.production   # DOMAIN and MAIL_FROM are pre-filled for mvpclub.io —
                        # fill in the Brevo SMTP_USER/SMTP_PASS from step 4,
                        # and generate the other secrets: openssl rand -hex 32
```

## 8. Launch

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

First boot creates the database from `schema.sql` automatically. Then apply the
feature migrations **in this order**:

```bash
alias psqlprod='docker compose -f docker-compose.prod.yml exec -T db psql -U mvpclub -d mvpclub'
psqlprod < backend/src/db/migrate-all.sql
psqlprod < backend/src/db/add-interview-recordings.sql
```

(If `migrate-all.sql` doesn't include a newer migration, apply that file
individually the same way.)

Visit https://mvpclub.io — Caddy will have fetched certificates within a
minute of DNS resolving. HTTPS also unlocks microphone access for interview
recordings.

## 9. Seed content (optional)

```bash
psqlprod < backend/src/db/seed-app.sql        # whichever seeds you want
```

## 10. Deploying updates

```bash
cd /opt/mvpclub
git pull                       # or re-rsync
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Run any new SQL file in `backend/src/db/` the same way as step 8.

## 11. Backups (do this before you have real users)

```bash
crontab -e
# nightly dump at 03:00, keep 14 days
0 3 * * * docker compose -f /opt/mvpclub/docker-compose.prod.yml exec -T db pg_dump -U mvpclub mvpclub | gzip > /root/backups/mvpclub-$(date +\%F).sql.gz && find /root/backups -mtime +14 -delete
```

Also back up the audio uploads volume occasionally:
`docker run --rm -v mvpclub_backend_uploads:/u -v /root/backups:/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .`

Hetzner's built-in server Backups option (a percentage of the server price) is
a good belt-and-braces addition — it snapshots the whole machine.

## Production gotchas already handled in this repo

- Caddy terminates TLS; frontend nginx proxies `/api` with `client_max_body_size 50m` (audio uploads)
- Postgres and the backend are not exposed to the internet — only Caddy's 80/443
- `backend_uploads` volume persists interview audio across rebuilds
- Frontend `npm run build` no longer blocks on typechecking (`npm run typecheck` runs it separately)
- Backend CORS uses FRONTEND_URL, LinkedIn callback derives from DOMAIN
- `mailer.ts` sends via any SMTP host (`SMTP_HOST`/`PORT`/`SECURE`), not hardcoded to Gmail, and the "from" address comes from `MAIL_FROM`/`MAIL_FROM_NAME` rather than the SMTP login — so the app can authenticate via Brevo while still showing `hello@mvpclub.io` as the sender

## Pre-flight checklist

- [ ] DNS A records point at the server
- [ ] Zoho MX/SPF/DKIM records added and domain shows verified — `hello@mvpclub.io` can send/receive in Zoho webmail
- [ ] Brevo domain authenticated (TXT + DKIM) and shows verified
- [ ] `.env.production` has real secrets, including Brevo `SMTP_USER`/`SMTP_PASS` (never the dev defaults)
- [ ] Migrations applied (step 8)
- [ ] Sign up, create an idea, log an interview, record 5s of audio — all on the live domain
- [ ] Trigger a password reset and confirm the email arrives from `hello@mvpclub.io`
- [ ] Stripe in live mode + webhook URL updated (if using donations)
- [ ] LinkedIn app's authorized redirect URL updated to https://mvpclub.io/api/linkedin/callback (if using)
- [ ] Backup cron installed
