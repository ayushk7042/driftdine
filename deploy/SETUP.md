# CI/CD setup (GitHub Actions → your VPS)

Pipeline file: `.github/workflows/ci-cd.yml`

| Job | When | What |
|---|---|---|
| `frontend` | every push / PR | `npm ci`, typecheck, production build, uploads `dist` |
| `backend` | every push / PR | `npm ci`, syntax check, loads the Express app |
| `deploy` | push to `main` (pause by setting repo variable `DEPLOY_ENABLED=false`) | uploads backend → `/var/www/admin.driftdine.com` and restarts PM2 `admin-driftdine`; uploads frontend build → `/var/www/driftdine.com/dist` |

Only the part that changed is deployed. Run it by hand from **Actions → CI / CD → Run workflow** (choose both / backend / frontend).

## 1. Add the secrets
GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value | How to get it |
|---|---|---|
| `SSH_HOST` | `72.60.221.29` | your server IP |
| `SSH_USER` | `root` | |
| `SSH_PRIVATE_KEY` | full private key (including the `-----BEGIN…` / `-----END…` lines) | on your Mac: `pbcopy < ~/.ssh/driftdine_deploy` then paste |
| `SSH_KNOWN_HOSTS` | `72.60.221.29 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIP+6JPJR8r4AtWKPkMYx1BYkR/T9/Hq/2Tj6MxWyBf8E` | pins the server so nobody can impersonate it (regenerate: `ssh-keyscan -t ed25519 72.60.221.29`) |
| `BACKEND_ENV` | the whole contents of your production `.env` | on your Mac: `pbcopy < admin.driftdine.com/.env` then paste |

`BACKEND_ENV` is written to `/var/www/admin.driftdine.com/.env` on every backend deploy (permissions 600) and `NODE_ENV` is forced to `production`. If you leave this secret out, the `.env` already on the server is kept.

The public half of the deploy key is already in `/root/.ssh/authorized_keys` on the server (comment `github-actions-driftdine`).

## 2. Optional variables (Variables tab, not secrets)
| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `https://admin.driftdine.com/api` | API address baked into the frontend build |
| `VITE_SITE_URL` | `https://driftdine.com` | canonical site URL |

## 3. Switch deployment on
Settings → Secrets and variables → Actions → **Variables** → New repository variable → `DEPLOY_ENABLED` = `true`.
Until then the pipeline only builds and tests. (Remove or set to anything else to pause deployments.)

Also create the **production** environment if you want a manual-approval gate: Settings → Environments → New → `production` → *Required reviewers*.

## Safety built in
* Backend: tarball backup in `/var/backups/driftdine/` (last 5 kept) → upload → `npm ci --omit=dev` → `pm2 restart` → health check on `127.0.0.1:4000/api/health`; if it fails the previous code is restored automatically.
* Frontend: new build uploaded to `dist.new`, swapped in atomically; previous build stays in `dist.prev`; smoke test, auto-restore on failure.
* `deploy/frontend/backend.sh` honour `DRY_RUN=1` (shows what would change, touches nothing).
* `public/sw.js` replaces the old site's service worker so returning visitors don't keep seeing the old app.

## Manual rollback
```bash
ssh root@72.60.221.29
# frontend
cd /var/www/driftdine.com && rm -rf dist && mv dist.prev dist
# backend
tar xzf /var/backups/driftdine/backend-<timestamp>.tar.gz -C /var/www && cd /var/www/admin.driftdine.com && npm ci --omit=dev && pm2 restart admin-driftdine
```

## Notes
* nginx already proxies `admin.driftdine.com → 127.0.0.1:4000` and serves `driftdine.com` from `/var/www/driftdine.com/dist` — nothing to change there.
* Rotate the server's root password (it was shared in a chat) and consider a non-root deploy user later.
