#!/usr/bin/env bash
# =====================================================================
# Aedentek CRM (Tessly) — VPS deploy (run on the host as root)
#   ./deploy/aedentek-crm-deploy.sh            # preflight + build + start + smoke tests
#   ./deploy/aedentek-crm-deploy.sh tls        # same, then (re)enable HTTPS vhosts
#   ./deploy/aedentek-crm-deploy.sh rollback   # restore the images from the previous deploy
#   ./deploy/aedentek-crm-deploy.sh check      # run the smoke tests only
# Deploy path:  git push  ->  VPS: git pull  ->  docker compose build+up
# =====================================================================
set -euo pipefail
DEP="/var/www/aedentek-crm-docker"
cd "$DEP"

LIVE_IMG="aedentekgithub/aedentek-crm:latest"
STAGING_IMG="aedentekgithub/aedentek-crm:staging"
LIVE_URL="http://127.0.0.1:5063"
STAGING_URL="http://127.0.0.1:5064"
# Secret that was hard-coded in the source before Phase 0. Tokens signed with it must be rejected.
OLD_FALLBACK_SECRET="aedentek-crm-secure-jwt-secret-key-2026"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------
# Preflight: refuse to deploy without per-environment secrets
# ---------------------------------------------------------------------
preflight() {
  echo "==> Preflight"
  local ok=1
  for f in .env.live .env.staging; do
    if [ ! -f "$f" ]; then
      red "  missing $DEP/$f  (copy deploy/env.${f#.env.}.example and fill it in)"; ok=0; continue
    fi
    local secret uri
    secret=$(grep -E '^JWT_SECRET=' "$f" | cut -d= -f2- || true)
    uri=$(grep -E '^MONGODB_URI=' "$f" | cut -d= -f2- || true)
    if [ ${#secret} -lt 32 ] || [[ "$secret" == REPLACE* ]] || [ "$secret" = "$OLD_FALLBACK_SECRET" ]; then
      red "  $f: JWT_SECRET missing, too short (<32 chars) or still the placeholder"; ok=0
    fi
    if [ -z "$uri" ] || [[ "$uri" == *REPLACE* ]]; then
      red "  $f: MONGODB_URI missing or still the placeholder"; ok=0
    fi
    if [ "$(stat -c %a "$f" 2>/dev/null || echo 600)" != "600" ]; then
      echo "  note: tightening permissions on $f to 600"; chmod 600 "$f"
    fi
  done
  local s1 s2
  s1=$(grep -E '^JWT_SECRET=' .env.live 2>/dev/null | cut -d= -f2- || true)
  s2=$(grep -E '^JWT_SECRET=' .env.staging 2>/dev/null | cut -d= -f2- || true)
  if [ -n "$s1" ] && [ "$s1" = "$s2" ]; then red "  live and staging must use different JWT_SECRET values"; ok=0; fi
  [ "$ok" = 1 ] || { red "Preflight failed — nothing was changed."; exit 1; }
  green "  env files OK"
}

# ---------------------------------------------------------------------
# Smoke tests: health + the Phase 0 security guarantees
# ---------------------------------------------------------------------
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@" || echo 000; }

smoke() {
  local name=$1 url=$2 svc=$3 fail=0
  echo "==> Smoke tests: $name ($url)"
  local c
  c=$(code "$url/api/health");                       [ "$c" = 200 ] && green "  health                       200" || { red "  health                       $c (expected 200)"; fail=1; }
  c=$(code "$url/api/clients");                      [ "$c" = 401 ] && green "  API without login            401" || { red "  API without login            $c (expected 401)"; fail=1; }
  c=$(code "$url/api/clients" -H 'Authorization: Bearer admin-token');
                                                     [ "$c" = 401 ] && green "  mock admin-token             401" || { red "  mock admin-token             $c (expected 401)"; fail=1; }
  c=$(code "$url/api/clients?role=Admin");           [ "$c" = 401 ] && green "  ?role=Admin                  401" || { red "  ?role=Admin                  $c (expected 401)"; fail=1; }
  c=$(code -X POST "$url/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@tessly.local","password":"dev1234"}')
                                                     [ "$c" = 401 ] && green "  dev1234 backdoor login       401" || { red "  dev1234 backdoor login       $c (expected 401)"; fail=1; }
  # A token signed with the old public fallback secret must be rejected (proves JWT_SECRET is in use)
  local forged
  forged=$(docker compose exec -T "$svc" node -e "process.stdout.write(require('jsonwebtoken').sign({id:'x',role:'Admin',accessLevel:'Admin'},'$OLD_FALLBACK_SECRET',{expiresIn:'5m'}))" 2>/dev/null || true)
  if [ -n "$forged" ]; then
    c=$(code "$url/api/clients" -H "Authorization: Bearer $forged")
    [ "$c" = 401 ] && green "  token with old secret        401" || { red "  token with old secret        $c (expected 401) — JWT_SECRET not applied"; fail=1; }
  else
    red "  could not mint test token inside $svc"; fail=1
  fi
  return $fail
}

rollback() {
  echo "==> Rollback to previous images"
  docker image inspect "$LIVE_IMG-rollback" >/dev/null 2>&1 && docker tag "$LIVE_IMG-rollback" "$LIVE_IMG" || red "  no live rollback image"
  docker image inspect "$STAGING_IMG-rollback" >/dev/null 2>&1 && docker tag "$STAGING_IMG-rollback" "$STAGING_IMG" || red "  no staging rollback image"
  docker compose up -d --no-build --force-recreate
  sleep 6
  docker compose ps
}

case "${1:-deploy}" in
  rollback) rollback; exit 0 ;;
  check)    s=0; smoke live "$LIVE_URL" live || s=1; smoke staging "$STAGING_URL" staging || s=1; exit $s ;;
esac

preflight

echo "==> Sync source from GitHub (main)"
git fetch origin
git reset --hard origin/main

echo "==> Keep current images for rollback"
docker image inspect "$LIVE_IMG" >/dev/null 2>&1 && docker tag "$LIVE_IMG" "$LIVE_IMG-rollback" || true
docker image inspect "$STAGING_IMG" >/dev/null 2>&1 && docker tag "$STAGING_IMG" "$STAGING_IMG-rollback" || true

echo "==> Build & (re)start containers (live 127.0.0.1:5063 / staging 127.0.0.1:5064)"
docker compose build
docker compose up -d
sleep 8
docker compose ps

echo "==> Database"
curl -s "$LIVE_URL/api/health"    | python3 -c "import json,sys;print('  live    db:', json.load(sys.stdin)['database']['name'])"    || true
curl -s "$STAGING_URL/api/health" | python3 -c "import json,sys;print('  staging db:', json.load(sys.stdin)['database']['name'])" || true

if ! smoke staging "$STAGING_URL" staging; then red "Staging smoke tests failed (staging left running for debugging)."; fi
if ! smoke live "$LIVE_URL" live; then
  red "LIVE smoke tests failed — rolling back live and staging to the previous images."
  rollback
  exit 1
fi
green "==> Deploy OK"

if [ "${1:-}" = "tls" ]; then
  echo "==> TLS activation"
  bash "$DEP/deploy/enable-https-nginx.sh"
  echo "==> Done"
fi
