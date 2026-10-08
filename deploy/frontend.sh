#!/usr/bin/env bash
# Publishes ./frontend/dist to /var/www/driftdine.com/dist (what nginx serves) with an atomic swap.
#   DRY_RUN=1 -> only shows what would be uploaded.
source "$(dirname "$0")/_lib.sh"

SITE_DIR=/var/www/driftdine.com
[ -f frontend/dist/index.html ] || { echo "frontend/dist/index.html missing — build first"; exit 1; }

if [ "$DRY_RUN" = "1" ]; then
  log "DRY RUN: compared with the live dist"
  rsync -azin --delete -e "$RSYNC_SSH" frontend/dist/ "$SSH_USER@$SSH_HOST:$SITE_DIR/dist/" | head -40
  exit 0
fi

log "Uploading build"
rsync -az --delete -e "$RSYNC_SSH" frontend/dist/ "$SSH_USER@$SSH_HOST:$SITE_DIR/dist.new/"

log "Swapping live folder (previous build kept as dist.prev)"
remote "cd $SITE_DIR && rm -rf dist.prev && (test -d dist && mv dist dist.prev || true) && mv dist.new dist"

log "Smoke test"
if remote "curl -fsS -H 'Host: driftdine.com' http://127.0.0.1/ | grep -q 'id=\"root\"'"; then
  log "Frontend deployed OK"
else
  log "Smoke test FAILED — restoring previous build"
  remote "cd $SITE_DIR && rm -rf dist && mv dist.prev dist"
  exit 1
fi
