#!/usr/bin/env bash
# Deploys ./admin.driftdine.com to /var/www/admin.driftdine.com and restarts the PM2 app.
# Keeps a backup first and rolls back automatically if the API does not come up healthy.
#   DRY_RUN=1  -> only shows what rsync would change; touches nothing.
#   BACKEND_ENV (optional) -> full contents of the production .env (written 0600, NODE_ENV forced to production)
source "$(dirname "$0")/_lib.sh"

APP_DIR=/var/www/admin.driftdine.com
PM2_NAME=admin-driftdine
PORT_CHECK=4000
TS=$(date +%Y%m%d-%H%M%S)

if [ "$DRY_RUN" = "1" ]; then
  log "DRY RUN: files that would be uploaded"
  rsync -azin --exclude node_modules --exclude '.env*' --exclude uploads/ -e "$RSYNC_SSH" admin.driftdine.com/ "$SSH_USER@$SSH_HOST:$APP_DIR/" | head -40
  remote "test -d $APP_DIR && echo 'target dir exists' && pm2 describe $PM2_NAME >/dev/null 2>&1 && echo 'pm2 app exists'"
  exit 0
fi

log "Backing up current backend"
remote "mkdir -p /var/backups/driftdine && tar czf /var/backups/driftdine/backend-$TS.tar.gz --exclude=node_modules -C /var/www admin.driftdine.com && ls -1t /var/backups/driftdine/backend-*.tar.gz | tail -n +6 | xargs -r rm -f"

log "Uploading code"
rsync -az --exclude node_modules --exclude '.env*' --exclude uploads/ -e "$RSYNC_SSH" admin.driftdine.com/ "$SSH_USER@$SSH_HOST:$APP_DIR/"

if [ -n "${BACKEND_ENV:-}" ]; then
  log "Writing production .env"
  printf '%s\n' "$BACKEND_ENV" | remote "umask 077; cat > $APP_DIR/.env.incoming && sed -i '/^NODE_ENV=/d' $APP_DIR/.env.incoming && echo 'NODE_ENV=production' >> $APP_DIR/.env.incoming && mv $APP_DIR/.env.incoming $APP_DIR/.env && chmod 600 $APP_DIR/.env"
else
  log "BACKEND_ENV secret not set — keeping the .env already on the server"
fi

log "Installing dependencies and restarting"
remote "cd $APP_DIR && npm ci --omit=dev --no-audit --no-fund && (pm2 describe $PM2_NAME >/dev/null 2>&1 && pm2 restart $PM2_NAME --update-env || pm2 start server.js --name $PM2_NAME --cwd $APP_DIR) && pm2 save >/dev/null"

log "Health check"
if remote "for i in \$(seq 1 30); do curl -fsS http://127.0.0.1:$PORT_CHECK/api/health && exit 0; sleep 1; done; exit 1"; then
  echo; log "Backend deployed OK"
else
  log "Health check FAILED — rolling back"
  remote "tar xzf /var/backups/driftdine/backend-$TS.tar.gz -C /var/www && cd $APP_DIR && npm ci --omit=dev --no-audit --no-fund && pm2 restart $PM2_NAME --update-env"
  exit 1
fi
