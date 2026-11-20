# Deployment & domain guide

> Nothing has been deployed. Do not publish this application or load real company data without explicit authorisation from SI Acoustic management.

## 1. Choosing hosting (no extra subscriptions)

The app is a Node.js server with a **persistent local data file** and a server-side session store. That rules out pure static hosting and makes serverless platforms a poor fit without a separate database.

| Option | Cost | Fit | Notes |
|---|---|---|---|
| **A. Company PC / mini-PC / NAS + Cloudflare Tunnel + Cloudflare Access** | Free (uses existing hardware; Cloudflare Zero Trust Free covers up to 50 users) | ✅ Recommended | No inbound ports opened; HTTPS and SSO/MFA in front of the app; data stays on company hardware. Requires the `siacoustic.com` DNS zone to be on Cloudflare (or a delegated subdomain). |
| B. Small VPS (any provider) + Caddy/Nginx | Low monthly cost | ✅ Good | Simple, always-on; you manage OS updates and backups. |
| C. Vercel / serverless free tiers | Free tier | ⚠️ Not as-is | Filesystem is not persistent → needs a hosted DB adapter first. Vercel's Hobby tier is limited to non-commercial personal use, so a company system would need a paid plan. |
| D. Google Sheets as the database | Free | ⚠️ Partial | Acceptable only for low-risk operational data via a server-side service account. Never for CONFIDENTIAL/RESTRICTED records. Adapter not yet implemented. |

Free-tier terms change; confirm current limits with the provider before committing.

## 2. Install on the host (Option A or B)

```bash
# Node.js 20.9+ (22 LTS recommended)
git clone <your-private-repo> si-acoustic-command-centre   # or copy the source folder
cd si-acoustic-command-centre
npm ci
cp .env.example .env.production.local
```

Edit `.env.production.local`:

```ini
SESSION_SECRET=<48+ random chars>
SEED_DEMO_PASSWORD=<strong temporary password, used only on first boot>
DATA_DIR=/var/lib/si-acoustic           # private, backed-up directory
APP_ORIGIN=https://rnddepartment-dashboard.siacoustic.com
```

```bash
sudo mkdir -p /var/lib/si-acoustic && sudo chown $USER /var/lib/si-acoustic && chmod 700 /var/lib/si-acoustic
npm run check          # lint, typecheck, tests, build
npm start              # listens on :3000
```

### Keep it running (systemd example)

```ini
# /etc/systemd/system/si-acoustic.service
[Unit]
Description=SI Acoustic R&D Command Centre
After=network.target

[Service]
WorkingDirectory=/opt/si-acoustic-command-centre
EnvironmentFile=/opt/si-acoustic-command-centre/.env.production.local
ExecStart=/usr/bin/npm start -- -p 3000 -H 127.0.0.1
Restart=always
User=siacoustic
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Windows host: use `npm start` under a service manager such as NSSM, or run it in WSL2 with the systemd unit above.

### Docker (optional — Dockerfile not yet tested)

```bash
docker build -t si-acoustic-cc .
docker run -d --name si-acoustic -p 127.0.0.1:3000:3000 \
  --env-file .env.production.local -e DATA_DIR=/data -v si-acoustic-data:/data si-acoustic-cc
```

## 3. Domain: `rnddepartment-dashboard.siacoustic.com`

You need access to the DNS for `siacoustic.com` (whoever manages the company website/domain).

### Option A — Cloudflare Tunnel (recommended)

1. Add `siacoustic.com` to a Cloudflare account (free plan) and switch nameservers at the registrar — *or* ask the DNS admin to delegate just the subdomain.
2. On the host: install `cloudflared`, then
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create si-acoustic-rnd
   cloudflared tunnel route dns si-acoustic-rnd rnddepartment-dashboard.siacoustic.com
   ```
3. `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: si-acoustic-rnd
   credentials-file: /home/siacoustic/.cloudflared/<tunnel-id>.json
   ingress:
     - hostname: rnddepartment-dashboard.siacoustic.com
       service: http://127.0.0.1:3000
     - service: http_status:404
   ```
   Run `cloudflared service install`.
4. In Cloudflare Zero Trust → Access → Applications, add a self-hosted app for the hostname with a policy “Emails ending in `@siacoustic.com`” (and require MFA). For the office TV, create a **service token** or a dedicated TV account policy.

### Option B — VPS with Caddy (automatic HTTPS)

1. DNS: create an `A` record `rnddepartment-dashboard` → VPS public IP (and `AAAA` if IPv6).
2. `/etc/caddy/Caddyfile`:
   ```
   rnddepartment-dashboard.siacoustic.com {
     reverse_proxy 127.0.0.1:3000
   }
   ```
3. `sudo systemctl reload caddy` — Caddy obtains the TLS certificate automatically.
4. Firewall: allow 80/443 only; keep 3000 bound to `127.0.0.1`.

## 4. Smart TV setup

1. Open the TV browser at `https://rnddepartment-dashboard.siacoustic.com/tv?motion=low`.
2. Sign in as the TV account (role `TV_VIEWER`). Sessions last `SESSION_TTL_HOURS` (set e.g. 168 for a week on the TV host only if acceptable).
3. Press the fullscreen button. Data refreshes every 60 s; if the network drops the last snapshot stays on screen with an *Offline* label.

## 5. Back-ups

Back up `DATA_DIR/db.json` and `DATA_DIR/audit.log` daily (e.g. encrypted copy to the company Google Drive or NAS). Test restores quarterly.

## 6. Go-live checklist

- [ ] Management authorisation to deploy
- [ ] HTTPS working on the final domain
- [ ] Access layer (SSO/MFA) in front of the app
- [ ] Demo users removed; real accounts created with correct roles
- [ ] Demo records replaced with verified data; classifications reviewed
- [ ] `tvVisible` reviewed for every project
- [ ] Backups configured and a restore tested
- [ ] `npm run check` and `npm run smoke` pass on the host
