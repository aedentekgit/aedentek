#!/usr/bin/env bash
# =====================================================================
# Aedentek CRM (Tessly) — VPS deploy (run on the host as root)
#   ./deploy/aedentek-crm-deploy.sh            # build + start both envs
#   ./deploy/aedentek-crm-deploy.sh tls        # + enable HTTPS (after DNS)
# Deploy path:  git push  ->  VPS: git pull  ->  docker compose build+up
# =====================================================================
set -euo pipefail
DEP="/var/www/aedentek-crm-docker"
cd "$DEP"

echo "==> Sync source from GitHub (main)"
git fetch origin
git reset --hard origin/main

echo "==> Build & (re)start containers (live 5063 / staging 5064)"
docker compose build
docker compose up -d
sleep 6
docker compose ps
echo "==> Health"
curl -s http://127.0.0.1:5063/api/health | python3 -c "import json,sys;print('live   db:', json.load(sys.stdin)['database']['name'])"
curl -s http://127.0.0.1:5064/api/health | python3 -c "import json,sys;print('staging db:', json.load(sys.stdin)['database']['name'])"

if [ "${1:-}" = "tls" ]; then
  echo "==> TLS activation"
  bash /var/www/aedentek-crm-docker/deploy/enable-https-nginx.sh
  echo "==> Done"
fi
