#!/usr/bin/env bash
# Shared helpers for the deploy scripts. Expects: SSH_HOST, SSH_USER, SSH_KEY_FILE, SSH_KNOWN_HOSTS_FILE
set -euo pipefail

: "${SSH_HOST:?SSH_HOST is required}"
: "${SSH_USER:=root}"
: "${SSH_KEY_FILE:?SSH_KEY_FILE is required}"
: "${SSH_KNOWN_HOSTS_FILE:?SSH_KNOWN_HOSTS_FILE is required}"
DRY_RUN="${DRY_RUN:-0}"

SSH_OPTS=(-i "$SSH_KEY_FILE" -o IdentitiesOnly=yes -o BatchMode=yes -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" -o StrictHostKeyChecking=yes -o ServerAliveInterval=20)
remote() { ssh "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST" "$@"; }
RSYNC_SSH="ssh ${SSH_OPTS[*]}"
log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
