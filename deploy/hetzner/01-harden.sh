#!/usr/bin/env bash
#
# 01-harden.sh — baseline hardening for a fresh Hetzner dedicated server (Debian/Ubuntu).
#
# Run as root on the NEW server, ONCE, before anything else.
#
#   scp 01-harden.sh root@<SERVER_IP>:/root/
#   ssh root@<SERVER_IP>
#   chmod +x /root/01-harden.sh && /root/01-harden.sh
#
# What it does:
#   1. Creates a non-root sudo user with your SSH public key
#   2. Locks down sshd (no root login, no passwords, no empty passwords)
#   3. Enables a UFW firewall (SSH + HTTP + HTTPS only)
#   4. Installs fail2ban, unattended-upgrades, and a few basics
#   5. Sets hostname, timezone, swap, and kernel network sysctls
#
# It does NOT delete your root password — it just stops root SSH login.
# Change the root password separately with `passwd` (the runbook says when).
#
# IMPORTANT: keep your current SSH session open until you have verified the new
# user can log in from a SECOND terminal. This script prints a reminder at the end.

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG — edit these five values before running
# ─────────────────────────────────────────────────────────────────────────────

NEW_USER="deploy"                    # non-root account you will use from now on
SSH_PORT="22"                        # change to e.g. 2222 if you want SSH off the default port
HOSTNAME_FQDN="mvpclub-prod"         # short hostname for this box
TIMEZONE="Europe/London"
SWAP_GB="8"                          # 0 to skip swapfile creation

# Paste your PUBLIC key here (the contents of ~/.ssh/id_ed25519.pub on your Mac).
# If you don't have one: ssh-keygen -t ed25519 -C "shthota@gmail.com"
SSH_PUBLIC_KEY="ssh-ed25519 AAAA...REPLACE_ME... your-comment"

# ─────────────────────────────────────────────────────────────────────────────

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\n\033[1;33m[!]\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run this as root."
[[ "$SSH_PUBLIC_KEY" == ssh-* ]] || die "Set SSH_PUBLIC_KEY at the top of this script first."
[[ "$SSH_PUBLIC_KEY" != *"REPLACE_ME"* ]] || die "SSH_PUBLIC_KEY still contains the placeholder."

export DEBIAN_FRONTEND=noninteractive

# ── 1. System basics ─────────────────────────────────────────────────────────
log "Updating packages"
apt-get update -qq
apt-get upgrade -y -qq

log "Installing base packages"
apt-get install -y -qq \
  sudo curl wget git vim htop tmux unzip jq ca-certificates gnupg \
  ufw fail2ban unattended-upgrades apt-listchanges \
  net-tools dnsutils rsync lsof ncdu

log "Setting hostname to ${HOSTNAME_FQDN} and timezone to ${TIMEZONE}"
hostnamectl set-hostname "$HOSTNAME_FQDN"
timedatectl set-timezone "$TIMEZONE"
grep -q "$HOSTNAME_FQDN" /etc/hosts || echo "127.0.1.1 ${HOSTNAME_FQDN}" >> /etc/hosts

# ── 2. Non-root user ─────────────────────────────────────────────────────────
if id "$NEW_USER" &>/dev/null; then
  log "User ${NEW_USER} already exists — reusing"
else
  log "Creating user ${NEW_USER}"
  adduser --disabled-password --gecos "" "$NEW_USER"
fi
usermod -aG sudo "$NEW_USER"

log "Installing SSH key for ${NEW_USER}"
install -d -m 700 -o "$NEW_USER" -g "$NEW_USER" "/home/${NEW_USER}/.ssh"
AUTH_KEYS="/home/${NEW_USER}/.ssh/authorized_keys"
touch "$AUTH_KEYS"
grep -qxF "$SSH_PUBLIC_KEY" "$AUTH_KEYS" || echo "$SSH_PUBLIC_KEY" >> "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"
chown "$NEW_USER:$NEW_USER" "$AUTH_KEYS"

# Passwordless sudo — comment out if you'd rather be prompted.
echo "${NEW_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-${NEW_USER}"
chmod 440 "/etc/sudoers.d/90-${NEW_USER}"
visudo -c >/dev/null || die "sudoers validation failed"

# ── 3. SSH hardening ─────────────────────────────────────────────────────────
log "Hardening sshd"
cp -n /etc/ssh/sshd_config "/etc/ssh/sshd_config.bak.$(date +%F)" 2>/dev/null || true

cat > /etc/ssh/sshd_config.d/99-hardening.conf <<EOF
Port ${SSH_PORT}
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitEmptyPasswords no
PubkeyAuthentication yes
AuthenticationMethods publickey
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 20
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers ${NEW_USER}
EOF

# Some images ship a cloud-init drop-in that re-enables password auth; neutralise it.
if [[ -f /etc/ssh/sshd_config.d/50-cloud-init.conf ]]; then
  sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config.d/50-cloud-init.conf
fi

sshd -t || die "sshd config test FAILED — not restarting. Fix before continuing."
systemctl restart ssh 2>/dev/null || systemctl restart sshd

# ── 4. Firewall ──────────────────────────────────────────────────────────────
log "Configuring UFW"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp" comment 'SSH'
ufw allow 80/tcp  comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose

# ── 5. fail2ban ──────────────────────────────────────────────────────────────
log "Configuring fail2ban"
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = ${SSH_PORT}
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

# ── 6. Automatic security updates ────────────────────────────────────────────
log "Enabling unattended security upgrades"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
cat > /etc/apt/apt.conf.d/51unattended-upgrades-local <<'EOF'
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
systemctl enable --now unattended-upgrades

# ── 7. Swap ──────────────────────────────────────────────────────────────────
if [[ "$SWAP_GB" -gt 0 ]] && ! swapon --show | grep -q .; then
  log "Creating ${SWAP_GB}G swapfile"
  fallocate -l "${SWAP_GB}G" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_GB * 1024))
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
else
  log "Skipping swap (SWAP_GB=${SWAP_GB} or swap already active)"
fi

# ── 8. Kernel / network sysctls ──────────────────────────────────────────────
log "Applying sysctl hardening"
cat > /etc/sysctl.d/99-hardening.conf <<'EOF'
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.tcp_syncookies = 1
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_source_route = 0
fs.inotify.max_user_watches = 524288
fs.file-max = 200000
EOF
sysctl --system >/dev/null

# ── 9. Summary ───────────────────────────────────────────────────────────────
log "Hardening complete"
cat <<EOF

  User ..........  ${NEW_USER}  (sudo, key-only)
  SSH port ......  ${SSH_PORT}
  Root SSH ......  disabled
  Passwords .....  disabled for SSH
  Firewall ......  $(ufw status | head -1)
  fail2ban ......  $(systemctl is-active fail2ban)
  Auto-updates ..  $(systemctl is-active unattended-upgrades)
  Swap ..........  $(swapon --show --noheadings | awk '{print $3}' | head -1 || echo none)

  ┌────────────────────────────────────────────────────────────────────┐
  │  DO NOT CLOSE THIS SESSION YET.                                    │
  │                                                                    │
  │  From a SECOND terminal on your Mac, verify:                       │
  │      ssh -p ${SSH_PORT} ${NEW_USER}@<SERVER_IP> 'sudo whoami'
  │                                                                    │
  │  It must print "root". Only then close this root session.          │
  │                                                                    │
  │  Then, still as root here, rotate the emailed password:            │
  │      passwd                                                        │
  │  (root can no longer log in over SSH, but the old password is      │
  │   still valid on the Hetzner rescue/KVM console.)                  │
  └────────────────────────────────────────────────────────────────────┘

EOF
