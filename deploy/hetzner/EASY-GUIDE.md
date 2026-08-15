# Putting MVP Club on the internet — the very slow, very detailed version

Nothing here assumes you know anything about servers. Every command is
copy-paste. After each one I tell you what you should see, so you always know
whether it worked.

**Set aside about 90 minutes.** A lot of that is waiting.

---

## Before you start: five things to know

**1. "Terminal" is the app you'll live in.**
Press `Cmd + Space`, type `Terminal`, press Enter. A window opens with white or
black text. That's it. That's the whole tool.

**2. Copy-paste works normally.**
`Cmd + C` to copy from this document, `Cmd + V` to paste into Terminal. Then
press **Enter** to actually run it. Pasting alone does nothing.

**3. Your Mac and the server are two different computers.**
Look at the start of the line where you type — the **prompt**. It tells you
which computer you're talking to:

```
shyamthota@Shyams-MacBook-Pro ~ %        ← you are on YOUR MAC
root@mvpclub-prod:~#                      ← you are on THE SERVER
deploy@mvpclub-prod:~$                    ← you are on THE SERVER (as "deploy")
```

Every step below says **[MAC]** or **[SERVER]**. If your prompt doesn't match,
you're on the wrong computer. Typing `exit` and pressing Enter takes you back
to your Mac.

**4. When you type a password, nothing appears.**
No dots, no stars, nothing. It looks broken. It isn't. Type it and press Enter.

**5. If anything goes wrong, stop.**
Don't skip ahead to "fix it later." Come back and ask. Every step below has a
"if it looks different" note.

---

# PART 1 — Set up your Mac

## Step 1.1 — Open Terminal

`Cmd + Space` → type `Terminal` → Enter.

**You should see:** a window with a line ending in `%` or `$`.

---

## Step 1.2 — Make your SSH key

An SSH key is a pair of files: a **private** one that stays on your Mac forever,
and a **public** one you give to the server. Together they let you log in
without a password. It's like a key and a lock.

Copy this whole line, paste into Terminal, press Enter:

```bash
ls ~/.ssh/id_ed25519.pub
```

**If you see a file path** like `/Users/shyamthota/.ssh/id_ed25519.pub` — you
already have a key. Skip to step 1.3.

**If you see `No such file or directory`** — you need to make one. Paste this:

```bash
ssh-keygen -t ed25519 -C "shthota@gmail.com"
```

It asks three questions:

1. `Enter file in which to save the key` → just press **Enter**
2. `Enter passphrase` → type a password you'll remember, press Enter
   *(nothing appears while typing — that's normal)*
3. `Enter same passphrase again` → type the same thing, press Enter

**You should see:** a box of random characters and symbols labelled
"The key's randomart image". That means it worked.

> ⚠️ Write that passphrase down somewhere safe. If you lose it you'll have to
> start this whole guide over.

---

## Step 1.3 — Go to your project folder

Paste this:

```bash
cd "/Users/shyamthota/Projects/MVP Club"
```

**You should see:** nothing at all, and the prompt now shows `MVP Club`.
No output means it worked. (That's normal in Terminal — silence is success.)

**If you see `No such file or directory`** — the folder has moved. Find it with:

```bash
ls ~/Projects
```

---

## Step 1.4 — Put your key into the setup script

The script `01-harden.sh` needs your public key inside it. Rather than editing
the file by hand (easy to get wrong), paste these three lines **one at a time**:

```bash
cd "/Users/shyamthota/Projects/MVP Club/deploy/hetzner"
```

```bash
sed -i '' "s|^SSH_PUBLIC_KEY=.*|SSH_PUBLIC_KEY=\"$(cat ~/.ssh/id_ed25519.pub)\"|" 01-harden.sh
```

```bash
grep '^SSH_PUBLIC_KEY' 01-harden.sh
```

**You should see** something like:

```
SSH_PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... shthota@gmail.com"
```

**If you still see the words `REPLACE_ME`** — it didn't work. Stop and ask.

---

# PART 2 — Point your domain at the server (do this early!)

The server needs `mvpclub.io` pointing at it **before** you deploy, otherwise
the padlock/HTTPS certificate won't work. This takes time to spread across the
internet, so start it now and it'll be ready when you need it.

## Step 2.1 — Log into Namecheap

Go to **namecheap.com** → sign in → **Domain List** → find `mvpclub.io` →
click **Manage** → click the **Advanced DNS** tab.

## Step 2.2 — Add two records

Click **ADD NEW RECORD** and fill in:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `@` | `65.109.81.205` | Automatic |

Click the green tick to save. Then **ADD NEW RECORD** again:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `www` | `65.109.81.205` | Automatic |

Green tick to save.

**If Namecheap already has records** with a Host of `@` or `www` (often a
"CNAME Record" pointing at `parkingpage.namecheap.com`) — **delete those**
using the bin icon. Two records with the same Host fight each other.

## Step 2.3 — Check it's working

Back in Terminal **[MAC]**:

```bash
dig +short mvpclub.io @1.1.1.1
```

**You should see:** `65.109.81.205`

**If you see nothing, or an old address** — it hasn't spread yet. This is
normal and can take 10 minutes to a few hours. Carry on with Part 3 and check
again later. **Do not start Part 6 until this shows the right address.**

---

# PART 3 — Set up email (while DNS is spreading)

Your app sends emails: password resets, interview invites. It can't send them
itself — it needs a service. You're using Brevo, which is free.

Open `DEPLOY.md` in your project folder and follow **section 4B** step by step.

At the end of it you will have two pieces of text:

- an **SMTP login** (looks like an email address)
- an **SMTP key** (a long random string)

**Copy both into a note somewhere.** You'll paste them in Part 6. The key is
shown only once.

> Why not just use Gmail? Because Gmail blocks apps sending on your behalf, and
> because your server's internet provider blocks the ports Gmail-style sending
> uses. Brevo is built for exactly this.

---

# PART 4 — Lock down the server

Right now your server can be logged into with a password, and that password was
emailed to you in plain text. Every server on the internet gets thousands of
automated login attempts a day. This part fixes that.

## Step 4.1 — Send the script to the server

**[MAC]** — make sure you're still in the `hetzner` folder, then paste:

```bash
scp 01-harden.sh root@65.109.81.205:/root/
```

**The very first time**, it asks:

```
The authenticity of host '65.109.81.205' can't be established.
ED25519 key fingerprint is SHA256:XM12eVwAYTxfo2loAN/S8Ze2DJHawyE5quuyzfSE1+8.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

**Check that the fingerprint matches** `XM12eVwAYTxfo2loAN/S8Ze2DJHawyE5quuyzfSE1+8`
— it's from your Hetzner email. If it matches, type `yes` and press Enter.
(Type the actual word `yes`. `y` won't do.)

**If the fingerprint is different — STOP.** Don't continue, don't type the
password. Something is wrong and you should ask.

Then it asks for a password. Paste the root password from the Hetzner email.
**Nothing will appear as you paste.** Press Enter.

**You should see:** `01-harden.sh    100%  10KB ...`

## Step 4.2 — Log into the server

```bash
ssh root@65.109.81.205
```

Same password again, nothing appears, press Enter.

**You should see:** your prompt change to `root@...:~#`.
**You are now typing on the server, not your Mac.**

## Step 4.3 — Run it

**[SERVER]** — paste:

```bash
chmod +x /root/01-harden.sh && /root/01-harden.sh
```

This takes 2–5 minutes. Lots of text scrolls past. That's fine — ignore it.

**You should see, at the end**, a summary box with `User .... deploy` and a big
warning telling you not to close the session yet.

**If it stops with a red `[x]` message** — read what it says, fix it, run it
again. The script is safe to re-run.

## Step 4.4 — ⚠️ THE IMPORTANT BIT — do not skip this

**Leave that Terminal window open.** Do not close it. Do not type `exit`.

That window is your only way back in if something is wrong. You're about to
check whether the new login method works — with a safety net still attached.

**Open a brand-new Terminal window:** press `Cmd + N`.

In the **new** window, paste:

```bash
ssh deploy@65.109.81.205 'sudo whoami'
```

It may ask for your **SSH key passphrase** (the one from step 1.2 — not the
Hetzner password).

**You should see:** the single word `root`

Now, in the same new window, paste:

```bash
ssh root@65.109.81.205
```

**You should see:** `Permission denied (publickey).`
**That is the correct answer.** It means password logins are switched off.

> **If the first command didn't print `root`, or the second one let you in:**
> something didn't apply. Go back to the old window (still open, still root) and
> ask for help before closing it.

## Step 4.5 — Change the old password

Both checks passed? Go back to the **first** window (the `root@` one) and paste:

```bash
passwd
```

Type a new long password twice. Nothing appears while typing.

**Save this new password in your password manager.** You'll almost never need
it — but if SSH ever breaks completely, it's how you get in via Hetzner's
emergency console.

Then:

```bash
exit
```

You can now close that window. From here on you log in as `deploy`, not `root`.

---

# PART 5 — Install Docker

Docker is the thing that runs your app. Think of it as a way of packing the
app, its database, and everything it needs into sealed boxes that behave the
same everywhere.

**[MAC]** — in your Terminal window:

```bash
cd "/Users/shyamthota/Projects/MVP Club/deploy/hetzner"
```

```bash
scp 02-docker.sh deploy@65.109.81.205:~
```

```bash
ssh deploy@65.109.81.205 'chmod +x 02-docker.sh && ./02-docker.sh'
```

Takes 2–3 minutes. Lots of scrolling.

**You should see** a summary ending with `Backups ..... nightly 03:30`.

Now check Docker actually works:

```bash
ssh deploy@65.109.81.205 'docker run --rm hello-world'
```

**You should see:** `Hello from Docker!`

**If you see `permission denied while trying to connect to the Docker daemon`**
— run that same command once more. The permission needs a fresh login to take
effect, and this is a fresh login.

---

# PART 6 — Put your app on the server

## Step 6.1 — Copy the code up

**[MAC]** — this copies your project to the server. It's long; copy all four
lines together:

```bash
rsync -av --exclude node_modules --exclude dist --exclude .git \
      --exclude _to_delete --exclude '_patches*' \
      "/Users/shyamthota/Projects/MVP Club/" \
      deploy@65.109.81.205:/opt/mvpclub/
```

**You should see:** a long list of filenames, then `sent ... bytes`.
Takes 1–3 minutes depending on your internet.

## Step 6.2 — Log into the server

```bash
ssh deploy@65.109.81.205
```

**You should see:** the prompt change to `deploy@mvpclub-prod:~$`.
**[SERVER] from here until I say otherwise.**

## Step 6.3 — Create the settings file

```bash
cd /opt/mvpclub
```

```bash
cp deploy/env.production.example .env.production && chmod 600 .env.production
```

**You should see:** nothing. Good.

## Step 6.4 — Generate the two secret passwords automatically

Your app needs two long random secrets. Don't invent them yourself — let the
computer do it. Paste these two lines **one at a time**:

```bash
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 32)|" .env.production
```

```bash
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env.production
```

Check they took:

```bash
grep -E '^(POSTGRES_PASSWORD|JWT_SECRET)=' .env.production
```

**You should see** two lines of long random letters and numbers.
**If either still says `CHANGE_ME`** — stop and ask.

## Step 6.5 — Add your Brevo email details

Only two things are left to fill in. Open the file:

```bash
nano .env.production
```

A text editor fills the window. **Nano works differently to normal apps:**

- Move around with the **arrow keys only**. Clicking does nothing.
- There's no mouse selection, no Cmd+Z.

Use the arrow keys to find these two lines:

```
SMTP_USER=CHANGE_ME_brevo_smtp_login
SMTP_PASS=CHANGE_ME_brevo_smtp_key
```

For each one: put the cursor at the **end of the line** (press the `End` key,
or `Ctrl + E`), then hold **Delete/Backspace** until everything after the `=`
is gone. Then paste your Brevo value with `Cmd + V`.

They should end up looking like:

```
SMTP_USER=8a3f21001@smtp-brevo.com
SMTP_PASS=xsmtpsib-a1b2c3d4e5f6...
```

**Now save and quit:**

1. `Ctrl + O`  (the letter O, not zero) — this means "write Out"
2. **Enter** — confirms the filename
3. `Ctrl + X` — exits

**You should be back at the `deploy@...$` prompt.**

Final check — this should print nothing at all:

```bash
grep CHANGE_ME .env.production
```

**If it prints anything**, that line still needs filling in. Run `nano
.env.production` again and fix it.

---

# PART 7 — Turn it on

## Step 7.1 — Check DNS is ready

**Do not do this part until step 2.3 shows `65.109.81.205`.** Check again:

```bash
dig +short mvpclub.io
```

**Must print `65.109.81.205`.** If not, wait longer. Starting early means the
certificate fails, and failing repeatedly gets you temporarily blocked from
retrying.

## Step 7.2 — Launch

**[SERVER]**:

```bash
cd /opt/mvpclub && cp deploy/hetzner/03-deploy.sh . && chmod +x 03-deploy.sh
```

```bash
./03-deploy.sh
```

**This takes 5–10 minutes the first time** — it's building your app from
scratch. Enormous amounts of text scroll past. Let it run. Don't press
anything.

**You should see, at the end:** a table of services all saying `running`, and
`Live at ... https://mvpclub.io`.

**If it ends with a red `[x]`** — read the message. The most common causes are
a `CHANGE_ME` left in the settings file, or DNS not being ready.

## Step 7.3 — Create the database tables

The app is running but its database is empty. Paste these three lines **one at
a time**:

```bash
alias psqlprod='docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db psql -U mvpclub -d mvpclub'
```

```bash
psqlprod < backend/src/db/migrate-all.sql
```

```bash
psqlprod < backend/src/db/add-interview-recordings.sql
```

**You should see** lines like `CREATE TABLE`, `ALTER TABLE`, `INSERT 0 1`.

`NOTICE: relation already exists, skipping` is **fine** — it means that bit was
already done.

`ERROR: syntax error` is **not fine** — stop and ask.

---

# PART 8 — Check it actually works

**[MAC]** — type `exit` first to leave the server, then:

```bash
curl -I https://mvpclub.io
```

**You should see:** `HTTP/2 200` on the first line.

**If you see `SSL certificate problem`** — the certificate is still being
issued. Wait two minutes and try again.

Now open **https://mvpclub.io** in your browser and do this in order:

1. **Sign up** for an account
2. **Create an idea**
3. **Log an interview**, and record 5 seconds of audio
   *(the microphone only works on `https://`, which is why the padlock matters)*
4. **Log out, then click "forgot password"** — check the email arrives from
   `hello@mvpclub.io`. Look in spam.

If all four work, you're live. 🎉

**One more thing worth clicking through:** the Validate section, steps 3 to 7.
That ordering was rearranged recently but has never actually been used in a
running app — this is the first time it runs for real.

---

# From now on

**To deploy a change**, after you've updated the code on your Mac:

```bash
cd "/Users/shyamthota/Projects/MVP Club"
rsync -av --exclude node_modules --exclude dist --exclude .git \
      --exclude _to_delete --exclude '_patches*' \
      "/Users/shyamthota/Projects/MVP Club/" deploy@65.109.81.205:/opt/mvpclub/
ssh deploy@65.109.81.205 'cd /opt/mvpclub && ./03-deploy.sh'
```

It backs up your database before changing anything, and tells you if there are
new database files you need to apply.

**To see what's wrong when something breaks:**

```bash
ssh deploy@65.109.81.205 'cd /opt/mvpclub && docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50'
```

**To copy your backups to your Mac** (do this occasionally):

```bash
mkdir -p ~/Backups/mvpclub
rsync -av deploy@65.109.81.205:/var/backups/mvpclub/ ~/Backups/mvpclub/
```

---

# When things go wrong

| What you see | What it means | What to do |
|---|---|---|
| `Permission denied (publickey)` as `deploy` | Your key isn't being offered | `ssh -i ~/.ssh/id_ed25519 deploy@65.109.81.205` |
| `Connection refused` / `timed out` | Server unreachable | Check Hetzner Robot — is the server powered on? |
| Locked out completely | — | Hetzner Robot → your server → KVM console → log in as `root` with the Part 4.5 password |
| Browser: "site can't be reached" | DNS or the app is down | `dig +short mvpclub.io`, then check the logs command above |
| Browser: certificate warning | Cert not issued yet | Wait 5 min. If it persists, DNS was wrong when you launched |
| A page shows an error but the site loads | A database file wasn't applied | Re-run the three lines in step 7.3 |
| A deploy made things worse | — | `cd /opt/mvpclub && git checkout <previous-version> && ./03-deploy.sh` |

---

# Glossary

| Word | What it actually means |
|---|---|
| **SSH** | Typing commands on a computer somewhere else |
| **SSH key** | Two matching files that log you in instead of a password |
| **DNS** | The internet's address book: turns `mvpclub.io` into `65.109.81.205` |
| **Docker** | Packs your app into sealed boxes so it runs the same anywhere |
| **Container** | One of those boxes, running |
| **Caddy** | Greets visitors, handles the padlock, passes them to your app |
| **Postgres** | Your database — where accounts, ideas and interviews are stored |
| **Migration** | A file that adds new tables or columns to the database |
| **Deploy** | Putting a new version of your app live |
| **root** | The all-powerful admin account. You've now switched it off for logins |
| **`deploy`** | The safer everyday account you made in Part 4 |
| **Backup** | A copy of your database, in case you break something |
