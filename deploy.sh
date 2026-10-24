#!/usr/bin/env bash
# Deploy FinReminder to the VPS (run from the project root).
# Usage: bash deploy.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:-srv1076274.hstgr.cloud}"
VPS_USER="${VPS_USER:-root}"
REMOTE_DIR="/opt/finreminder"
SSH="ssh -o StrictHostKeyChecking=accept-new ${VPS_USER}@${VPS_HOST}"

echo "==> Syncing project to ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}"
$SSH "mkdir -p ${REMOTE_DIR}"
tar czf - \
  --exclude='.git' --exclude='node_modules' --exclude='dist' \
  --exclude='.angular' --exclude='android' --exclude='.venv' \
  --exclude='__pycache__' --exclude='dev.db' \
  . | $SSH "tar xzf - -C ${REMOTE_DIR}"

echo "==> Ensuring Docker is installed"
$SSH 'command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh'

echo "==> Building and starting containers"
$SSH "cd ${REMOTE_DIR} && docker compose up -d --build"

echo "==> Status"
$SSH "cd ${REMOTE_DIR} && docker compose ps"

echo "Done. https://app.narukullapati.com goes live once Traefik issues the TLS cert."
