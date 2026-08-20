# MVP Club → Hetzner: the short version

Server `65.109.81.205` · domain `mvpclub.io` · ~1 hour, mostly waiting.

Copy-paste each block in order. If a block errors, stop — don't skip ahead.

---

## Step 1 — On your Mac: get an SSH key

```bash
ls ~/.ssh/id_ed25519.pub || ssh-keygen -t ed25519 -C "shthota@gmail.com"
cat ~/.ssh/id_ed25519.pub
```

Copy that whole `ssh-ed25519 AAAA...` line. You need it in step 2.

---

## Step 2 — Point the domain at the server

Namecheap → `mvpclub.io` → Manage → Advanced DNS. Add two records:

| Type | Host | Value |
|------|------|-------|
| A | @ | `65.109.81.205` |
| A | www | `65.109.81.205` |

Do this **now**, before deploying, so the HTTPS certificate works first try.

Check it worked (may take 10–30 min):

```bash
dig +short mvpclub.io @1.1.1.1        # must print 65.109.81.205
```

---

## Step 3 — Set up Brevo email

Follow `DEPLOY.md` section 4B. You need two things out of it at the end:
your **SMTP login** and **SMTP key**. Keep them handy for step 6.

(Do this while DNS propagates — the DNS records for both live on the same page.)

---

## Step 4 — Lock down the server

Open `01-harden.sh`, find line 38, paste your key from step 1:

```bash
SSH_PUBLIC_KEY="ssh-ed25519 AAAA...your actual key here..."
```

Then:

```bash
scp deploy/hetzner/01-harden.sh root@65.109.81.205:/root/
ssh root@65.109.81.205
chmod +x /root/01-harden.sh && /root/01-harden.sh
```

**Leave that terminal open.** Open a second one and check:

```bash
ssh deploy@65.109.81.205 'sudo whoami'    # prints: root
ssh root@65.109.81.205                     # must be REFUSED
```

Both correct? Back in the first terminal:

```bash
passwd        # new long password, save it in your password manager
exit
```

---

## Step 5 — Install Docker

```bash
scp deploy/hetzner/02-docker.sh deploy@65.109.81.205:~
ssh deploy@65.109.81.205 'chmod +x 02-docker.sh && ./02-docker.sh'
ssh deploy@65.109.81.205 'docker run --rm hello-world'
```

---

## Step 6 — Get the code up and configure it

The server pulls from GitHub, so push first:

```bash
cd "/Users/shyamthota/Projects/MVP Club"
git push origin main          # must succeed before continuing
```

Give the server read access to the repo (a **deploy key**):

```bash
ssh deploy@65.109.81.205
ssh-keygen -t ed25519 -C "mvpclub-server-deploy-key" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copy that line → github.com/shthota14/mvp-club → **Settings → Deploy keys →
Add deploy key** → paste → leave "Allow write access" **unchecked** → Add.

Then clone and configure:

```bash
git clone git@github.com:shthota14/mvp-club.git /opt/mvpclub
cd /opt/mvpclub
cp deploy/env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

In that file, replace **every** `CHANGE_ME`:

- `POSTGRES_PASSWORD` and `JWT_SECRET` → run `openssl rand -hex 32` for each
- `SMTP_USER` / `SMTP_PASS` → the Brevo login and key from step 3

Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## Step 7 — Launch

```bash
cd /opt/mvpclub
cp deploy/hetzner/03-deploy.sh . && chmod +x 03-deploy.sh
./03-deploy.sh
```

Then set up the database tables:

```bash
alias psqlprod='docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db psql -U mvpclub -d mvpclub'
psqlprod < backend/src/db/migrate-all.sql
psqlprod < backend/src/db/add-interview-recordings.sql
```

---

## Step 8 — Check it works

```bash
curl -I https://mvpclub.io           # 200 OK
curl -s https://mvpclub.io/api/health
```

Then in a browser on **https://mvpclub.io**:

1. Sign up
2. Create an idea
3. Log an interview + record 5 seconds of audio
4. Trigger a password reset — confirm the email arrives

---

## From now on: deploying an update

Push, then deploy — always that order:

```bash
cd "/Users/shyamthota/Projects/MVP Club"
git add -A && git commit -m "what changed" && git push origin main
ssh deploy@65.109.81.205 'cd /opt/mvpclub && ./03-deploy.sh'
```

It backs up the database first, and tells you if there are new `.sql` files
you need to apply by hand.

---

## If something breaks

| Problem | Do this |
|---|---|
| Locked out of SSH | Hetzner Robot → KVM console, log in as root with the step-4 password |
| Site won't load | `ssh deploy@... 'cd /opt/mvpclub && docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50'` |
| No HTTPS certificate | DNS isn't resolving yet — re-check step 2, wait, then restart Caddy |
| Bad deploy | `cd /opt/mvpclub && git checkout <last-good-sha> && ./03-deploy.sh` |
| Feature 500s | A migration didn't get applied — re-run the psqlprod lines in step 7 |

Full detail and the reasoning behind each step is in `RUNBOOK.md`.
